import { OHIF } from 'meteor/ohif:core';
import { MeasurementHandlers } from 'meteor/ohif:measurements/client/lib/MeasurementHandlers';

Session.set('TimepointsReady', false);
Session.set('MeasurementsReady', false);

Template.viewer.onCreated(() => {
    ViewerData = window.ViewerData || ViewerData;

    const instance = Template.instance();

    ValidationErrors.remove({});

    instance.data.state = new ReactiveDict();
    instance.data.state.set('leftSidebar', Session.get('leftSidebar'));
    instance.data.state.set('rightSidebar', Session.get('rightSidebar'));

    const contentId = instance.data.contentId;

    OHIF.viewer.functionList = $.extend(OHIF.viewer.functionList, {
        toggleLesionTrackerTools: toggleLesionTrackerTools,
        clearTools: clearTools,
        bidirectional: () => {
            // Used for hotkeys
            toolManager.setActiveTool('bidirectional');
        },
        nonTarget: () => {
            // Used for hotkeys
            toolManager.setActiveTool('nonTarget');
        }
    });

    // The hotkey can also be an array (e.g. ["NUMPAD0", "0"])
    OHIF.viewer.defaultHotkeys = OHIF.viewer.defaultHotkeys || {};
    OHIF.viewer.defaultHotkeys.toggleLesionTrackerTools = 'O';
    OHIF.viewer.defaultHotkeys.bidirectional = 'T'; // Target
    OHIF.viewer.defaultHotkeys.nonTarget = 'N'; // Non-target

    if (ViewerData[contentId].loadedSeriesData) {
        OHIF.log.info('Reloading previous loadedSeriesData');
        OHIF.viewer.loadedSeriesData = ViewerData[contentId].loadedSeriesData;

    } else {
        OHIF.log.info('Setting default ViewerData');
        OHIF.viewer.loadedSeriesData = {};
        ViewerData[contentId].loadedSeriesData = {};
        Session.set('ViewerData', ViewerData);
    }

    Session.set('activeViewport', ViewerData[contentId].activeViewport || false);

    // Set lesion tool buttons as disabled if pixel spacing is not available for active element
    instance.autorun(pixelSpacingAutorunCheck);

    // Update the ViewerStudies collection with the loaded studies
    ViewerStudies.remove({});

    instance.data.studies.forEach(study => {
        study.selected = true;
        study.displaySets = createStacks(study);
        ViewerStudies.insert(study);
    });

    if (instance.data.currentTimepointId) {
        instance.data.timepointApi = new OHIF.measurements.TimepointApi(instance.data.currentTimepointId);
        const timepointsPromise = instance.data.timepointApi.retrieveTimepoints();
        timepointsPromise.then(() => {
            Session.set('TimepointsReady', true);
        });

        instance.data.measurementApi = new OHIF.measurements.MeasurementApi(instance.data.currentTimepointId);
        const measurementsPromise = instance.data.measurementApi.retrieveMeasurements();
        measurementsPromise.then(() => {
            Session.set('MeasurementsReady', true);

            instance.data.measurementApi.syncMeasurementsAndToolData();
        });

        // Provide the necessary data to the Measurement API and Timepoint API
        const prior = instance.data.timepointApi.prior();
        if (prior) {
            instance.data.measurementApi.priorTimepointId = prior.timepointId;
        }
    } else {
        console.warn('No current timepoint specified');
        instance.data.measurementApi = new OHIF.measurements.MeasurementApi();
    }
});

Template.viewer.helpers({
    dataSourcesReady() {
        // TODO: Find a better way to do this
        return Session.get('TimepointsReady') && Session.get('MeasurementsReady');
    }
});

Template.viewer.events({
    'CornerstoneToolsMeasurementAdded .imageViewerViewport'(event, instance, eventData) {
        MeasurementHandlers.onAdded(event, instance, eventData);
    },
    'CornerstoneToolsMeasurementModified .imageViewerViewport'(event, instance, eventData) {
        MeasurementHandlers.onModified(event, instance, eventData);
    },
    'CornerstoneToolsMeasurementRemoved .imageViewerViewport'(event, instance, eventData) {
        MeasurementHandlers.onRemoved(event, instance, eventData);
    }
});
