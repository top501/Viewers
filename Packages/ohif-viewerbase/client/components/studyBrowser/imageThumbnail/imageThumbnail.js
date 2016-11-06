import { Template } from 'meteor/templating';
import { Tracker } from 'meteor/tracker';
import { Session } from 'meteor/session';

Template.imageThumbnail.onCreated(() => {
    const instance = Template.instance();

    // Get the image ID for current thumbnail
    instance.getThumbnailImageId = () => {
        const stack = instance.data.thumbnail.stack;
        const imageInstance = stack.images[0];
        return getImageId(imageInstance);
    };
});

Template.imageThumbnail.onRendered(() => {
    const instance = Template.instance();

    // Declare DOM and jQuery objects
    const $parent = instance.$('.imageThumbnail');
    const $loading = $parent.find('.imageThumbnailLoadingIndicator');
    const $loadingError = $parent.find('.imageThumbnailErrorLoadingIndicator');
    const $element = $parent.find('.imageThumbnailCanvas');
    const element = $element.get(0);

    instance.refreshImage = () => {
        // Disable cornerstone for thumbnail element and remove its canvas
        cornerstone.disable(element);

        // Activate the loading state
        $loading.css('display', 'block');

        // Define a handler for success on image load
        const loadSuccess = image => {
            // Enable cornerstone for thumbnail element again creating a new canvas
            cornerstone.enable(element);

            cornerstone.displayImage(element, image);
            $loading.css('display', 'none');
        };

        // Define a handler for error on image load
        const loadError = () => {
            $loading.css('display', 'none');
            $loadingError.css('display', 'block');
        };

        // Get the image ID
        const imageId = instance.getThumbnailImageId();

        // Call cornerstone image loader with the defined handlers
        cornerstone.loadAndCacheImage(imageId).then(loadSuccess, loadError);
    };

    // Run this computation every time the current study is changed
    instance.autorun(() => {
        // Check if there is a reactive var set for current study
        if (instance.data.currentStudy) {
            // Register a dependency from this computation on current study
            instance.data.currentStudy.dep.depend();
        }

        // Wait for the new data and refresh the image thumbnail
        Tracker.afterFlush(() => instance.refreshImage());
    });
});

Template.imageThumbnail.onDestroyed(() => {
    const instance = Template.instance();

    // Declare DOM and jQuery objects
    const $parent = instance.$('.imageThumbnail');
    const $element = $parent.find('.imageThumbnailCanvas');
    const element = $element.get(0);

    cornerstone.disable(element);
});

Template.imageThumbnail.helpers({
    // Executed every time the image loading progress is changed
    percentComplete() {
        const instance = Template.instance();

        // Get the encoded image ID for thumbnail
        const encodedImageId = OHIF.string.encodeId(instance.getThumbnailImageId());

        // Register a dependency from this computation on Session key
        const percentComplete = Session.get('CornerstoneThumbnailLoadProgress' + encodedImageId);

        // Return the complete percent amount of the image loading
        if (percentComplete && percentComplete !== 100) {
            return percentComplete + '%';
        }
    }
});
