import { Meteor } from 'meteor/meteor';
import { $ } from 'meteor/jquery';

import { OHIF } from 'meteor/ohif:core';

class MeasurementHandlers {

    static onAdded(e, instance, eventData) {
        const measurementData = eventData.measurementData;

        const config = OHIF.measurements.MeasurementApi.getConfiguration();
        const toolTypes = config.measurementTools.map(tool => tool.cornerstoneToolType);

        const index = toolTypes.indexOf(eventData.toolType);
        if (index === -1) {
            return;
        }

        const measurementToolConfiguration = config.measurementTools[index];
        const measurementApi = instance.data.measurementApi;
        const Collection = measurementApi[measurementToolConfiguration.id];

        // Get the Cornerstone imageId
        const enabledElement = cornerstone.getEnabledElement(eventData.element);
        const imageId = enabledElement.image.imageId;

        // Get studyInstanceUid & patientId
        const study = cornerstoneTools.metaData.get('study', imageId);
        const studyInstanceUid = study.studyInstanceUid;
        const patientId = study.patientId;

        // Get seriesInstanceUid
        const series = cornerstoneTools.metaData.get('series', imageId);
        const seriesInstanceUid = series.seriesInstanceUid;

        // Get sopInstanceUid
        const sopInstance = cornerstoneTools.metaData.get('instance', imageId);
        const sopInstanceUid = sopInstance.sopInstanceUid;
        const frameIndex = sopInstance.frame || 0;

        OHIF.log.info('CornerstoneToolsMeasurementAdded');

        let measurement = $.extend({
            userId: Meteor.userId(),
            patientId: patientId,
            studyInstanceUid: studyInstanceUid,
            seriesInstanceUid: seriesInstanceUid,
            sopInstanceUid: sopInstanceUid,
            frameIndex: frameIndex,
            imageId: imageId // TODO: In the future we should consider removing this
        }, measurementData);

        const timepointApi = instance.data.timepointApi;
        if (timepointApi) {
            const timepoint = timepointApi.study(studyInstanceUid)[0];
            if (timepoint) {
                const timepointId = timepoint.timepointId;
                measurement.timepointId = timepointId;
                measurement.measurementNumber = OHIF.measurements.MeasurementManager.getNewMeasurementNumber(timepointId, Collection, timepointApi);

                // TODO: Fix this
                measurement.measurementNumberAbsolute = measurement.measurementNumber;
            }
        } else {
            const numCurrentMeasurementsInStudy = Collection.find({
                studyInstanceUid: study.studyInstanceUid
            }).count();
            measurement.measurementNumber = numCurrentMeasurementsInStudy + 1;
        }

        // Clean the measurement according to the Schema
        measurementToolConfiguration.schema.clean(measurement);

        // Insert the new measurement into the collection
        measurementData._id = Collection.insert(measurement);
    }

    static onModified(e, instance, eventData) {
        const measurementData = eventData.measurementData;

        const config = OHIF.measurements.MeasurementApi.getConfiguration();
        const toolTypes = config.measurementTools.map(tool => tool.cornerstoneToolType);

        const index = toolTypes.indexOf(eventData.toolType);
        if (index === -1) {
            return;
        }

        const measurementToolConfiguration = config.measurementTools[index];
        const measurementApi = instance.data.measurementApi;
        const Collection = measurementApi[measurementToolConfiguration.id];

        OHIF.log.info('CornerstoneToolsMeasurementModified');

        let measurement = Collection.findOne(measurementData._id);

        Object.keys(measurementData).forEach(key => {
            measurement[key] = measurementData[key];
        });

        const measurementId = measurement._id;
        delete measurement._id;

        // Clean the measurement according to the Schema
        measurementToolConfiguration.schema.clean(measurement);

        // Insert the new measurement into the collection
        Collection.update(measurementId, {
            $set: measurement
        });
    }

    static onRemoved(e, instance, eventData) {
        const measurementData = eventData.measurementData;

        const config = OHIF.measurements.MeasurementApi.getConfiguration();
        const toolTypes = config.measurementTools.map(tool => tool.cornerstoneToolType);

        const index = toolTypes.indexOf(measurementData.toolType);
        if (index === -1) {
            return;
        }

        OHIF.log.info('CornerstoneToolsMeasurementRemoved');

        const measurementToolConfiguration = config.measurementTools[index];
        const measurementApi = instance.data.measurementApi;
        const Collection = measurementApi[measurementToolConfiguration.id];

        Collection.remove(measurementData._id);
    }

}

OHIF.measurements.MeasurementHandlers = MeasurementHandlers;
