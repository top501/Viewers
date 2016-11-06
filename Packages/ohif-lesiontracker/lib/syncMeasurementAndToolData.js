function toolDataExists(toolState, imageId, toolType) {
    const currentToolState = toolState[imageId][toolType];
    return (currentToolState && currentToolState.data && currentToolState.data.length);
}

syncMeasurementAndToolData = function(measurement) {
    log.info('syncMeasurementAndToolData');

    const toolState = cornerstoneTools.globalImageIdSpecificToolStateManager.toolState;
    const imageId = measurement.imageId;
    const toolType = measurement.toolType;

    // If no tool state exists for this imageId, create an empty object to store it
    if (!toolState[imageId]) {
        toolState[imageId] = {};
    }

    // Check if we already have toolData for this imageId and toolType
    if (toolDataExists(toolState, imageId, toolType)) {
        // If we have toolData, we should search it for any toolData
        // related to the current Measurement
        const toolData = toolState[imageId][toolType].data;

        // Create a flag so we know if we have successfully updated
        // this Measurement's in the toolData
        let alreadyExists = false;

        // Loop through the toolData to search for this Measurement
        toolData.forEach(function(tool) {
            // Break the loop if this isn't the Measurement we are looking for
            if (tool._id !== measurement._id) {
                return;
            }

            // If we have found the Measurement, set the flag to True
            alreadyExists = true;

            // Update the toolData from the Measurement data
            $.extend(tool, measurement);
            return false;
        });

        // If we have found the Measurement we intended to update, we can stop
        // this function here
        if (alreadyExists === true) {
            return;
        }
    } else {
        // If no toolData exists for this toolType, create an empty array to hold some
        toolState[imageId][toolType] = {
            data: []
        };
    }

    // If we have reached this point, it means we haven't found the Measurement we are
    // looking for in the current toolData. This means we need to add it.

    // Add the MeasurementData into the toolData for this imageId
    toolState[imageId][toolType].data.push(measurement);
};