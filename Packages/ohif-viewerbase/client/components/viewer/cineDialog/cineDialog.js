import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { OHIF } from 'meteor/ohif:core';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';

Template.cineDialog.onCreated(() => {
    const instance = Template.instance();

    // Create the data schema for CINE controls
    instance.schema = new SimpleSchema({
        intervalId: {
            type: Number,
            optional: true
        },
        loop: {
            type: Boolean,
            label: 'Loop',
            defaultValue: true
        },
        framesPerSecond: {
            type: Number,
            label: '',
            defaultValue: 24,
            min: 1,
            max: 90,
            optional: true
        }
    });

    // Update the current viewport frame rate
    instance.updateFramerate = rate => {
        OHIF.viewer.cine.framesPerSecond = rate;

        // Update playClip toolData for this imageId
        const element = getActiveViewportElement();
        if (!element) {
            return;
        }

        const playClipToolData = cornerstoneTools.getToolState(element, 'playClip');
        playClipToolData.data[0].framesPerSecond = OHIF.viewer.cine.framesPerSecond;

        // If the movie is playing, stop/start to update the framerate
        if (isPlaying()) {
            cornerstoneTools.stopClip(element);
            cornerstoneTools.playClip(element);
        }

        Session.set('UpdateCINE', Random.id());
    };

    // Define the actions API
    instance.api = {
        displaySetPrevious: () => OHIF.viewer.moveDisplaySets(false),
        displaySetNext: () => OHIF.viewer.moveDisplaySets(true),
        cineToggle: () => toggleCinePlay(),
        cineFirst: () => switchToImageByIndex(0),
        cineLast: () => switchToImageByIndex(-1),
        cinePrevious: () => switchToImageRelative(-1),
        cineNext: () => switchToImageRelative(1),
        cineSlowDown: () => {
            const newValue = OHIF.viewer.cine.framesPerSecond - 1;
            if (newValue > 0) {
                instance.updateFramerate(newValue);
            }
        },
        cineSpeedUp: () => {
            const newValue = OHIF.viewer.cine.framesPerSecond + 1;
            if (newValue <= 90) {
                instance.updateFramerate(newValue);
            }
        }
    };

    // Run this computation every time the active viewport is changed
    instance.autorun(() => {
        Session.get('activeViewport');

        Tracker.afterFlush(() => {
            // Get the active viewportElement
            const element = getActiveViewportElement();
            if (!element) {
                return;
            }

            // Get the cornerstone playClip tool data
            const toolData = cornerstoneTools.getToolState(element, 'playClip').data[0];

            // Get the cine object
            const cine = OHIF.viewer.cine;

            // replace the cine values with the tool data
            _.extend(cine, toolData);

            // Set the defaults
            cine.framesPerSecond = cine.framesPerSecond || 24;
            cine.loop = _.isUndefined(cine.loop) ? true : cine.loop;

            // Set the updated data on the form inputs
            instance.$('form:first').data('component').value(cine);

            // Update the session to refresh the framerate text
            Session.set('UpdateCINE', Random.id());
        });
    });

    /**
     * Set/Reset Window resize handler. This function is a replacement for
     * ... jQuery's on('resize', func) version which, for some unkown reason
     * ... is currently not working for this portion of code.
     * ... Further investigation is necessary.
     *
     * This happens because when an event is attached using jQuery's
     * you can't get it using vanilla JavaScript, it returns null. 
     * You need to use jQuery for that. So, either you use vanilla JS or jQuery
     * to get an element's event handler. See viewerMain for more details.
     */

    instance.setResizeHandler = handler => {
        if (typeof handler === 'function') {
            const origHandler = window.onresize;
            instance.origWindowResizeHandler = typeof origHandler === 'function' ? origHandler : null;
            window.onresize = function (event) {
                if (typeof origHandler === 'function') {
                    origHandler.call(window, event);
                }
                handler.call(window, event);
            };
        } else {
            window.onresize = instance.origWindowResizeHandler || null;
            window.origWindowResizeHandler = null;
        }
    };

    /**
     * Set optimal position for Cine dialog.
     */

    instance.setOptimalPosition = (event, options) => {

        let toolbarElement = $('.toolbarSection .toolbarSectionTools:first'),
            cineDialog = $('#cineDialog'),
            cineDialogSize,
            cineDialogCoords,
            toolbarRect;

        if (toolbarElement.length < 1 || cineDialog.length < 1) {
            return;
        }

        if (cineDialog.data('wasDragged') || cineDialog.data('wasBounded')) {
            // restore original handler...
            instance.setResizeHandler(null);
            return;
        }

        cineDialogSize = {
            width: cineDialog.outerWidth() || 0,
            height: cineDialog.outerHeight() || 0
        };

        toolbarRect = {
            offset: toolbarElement.offset() || { top: 0, left: 0 },
            width: toolbarElement.outerWidth() || 0,
            height: toolbarElement.outerHeight() || 0
        };

        cineDialogCoords = {
            left: toolbarRect.offset.left + toolbarRect.width + 20,
            top: toolbarRect.offset.top + toolbarRect.height - cineDialogSize.height
        };

        if (options) {
            if (options.left) {
                cineDialogCoords.left = options.left;
            }
            if (options.top) {
                cineDialogCoords.top = options.top;
            }
        }

        cineDialog.css(cineDialogCoords);

    };

});

Template.cineDialog.onRendered(() => {

    const instance = Template.instance();

    let dialog = instance.$('#cineDialog'),
        singleRowLayout = OHIF.uiSettings.displayEchoUltrasoundWorkflow;

    // set dialog in optimal position and make sure it continues in a optimal position...
    // ... when the window has been resized
    instance.setOptimalPosition(null, {
        top: singleRowLayout ? 47 : 26
    });

    // The jQuery method does not seem to be working...
    // ... $(window).resize(instance.setOptimalPosition)
    // This requires additional investigation.
    instance.setResizeHandler(instance.setOptimalPosition);

    // Make the CINE dialog bounded and draggable
    dialog.bounded().draggable({ defaultElementCursor: 'move' });

    // Prevent dialog from being dragged when user clicks any button
    dialog.find('.cine-navigation, .cine-controls, .cine-options').on('mousedown touchstart', function (e) {
        e.stopPropagation();
    });

});

Template.cineDialog.onDestroyed(() => {
    const instance = Template.instance();
    // remove resize handler...
    instance.setResizeHandler(null);
});

Template.cineDialog.events({
    'change [data-key=loop] input'(event, instance) {
        const element = getActiveViewportElement();
        const playClipToolData = cornerstoneTools.getToolState(element, 'playClip');
        playClipToolData.data[0].loop = $(event.currentTarget).is(':checked');
        OHIF.viewer.cine.loop = playClipToolData.data[0].loop;
    },

    'input [data-key=framesPerSecond] input'(event, instance) {
        // Update the FPS text onscreen
        const rate = parseFloat($(event.currentTarget).val());
        instance.updateFramerate(rate);
    }
});

Template.cineDialog.helpers({
    isPlaying() {
        return isPlaying();
    },

    framerate() {
        Session.get('UpdateCINE');
        return OHIF.viewer.cine.framesPerSecond.toFixed(1);
    },

    displaySetDisabled(isNext) {
        Session.get('LayoutManagerUpdated');
        return !OHIF.viewer.canMoveDisplaySets(isNext) ? 'disabled' : '';
    },

    getClassNames(baseCls) {
        return baseCls + ' ' + (OHIF.uiSettings.displayEchoUltrasoundWorkflow ? 'single' : 'double') + '-row-style'
    }

});
