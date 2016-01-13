/**
 * Parses the SourceImageSequence, if it exists, in order
 * to return a ReferenceSOPInstanceUID. The ReferenceSOPInstanceUID
 * is used to refer to this image in any accompanying DICOM-SR documents.
 *
 * @param instance
 * @returns {String} The ReferenceSOPInstanceUID
 */
function getSourceImageInstanceUid(instance) {
    // TODO= Parse the whole Source Image Sequence
    // This is a really poor workaround for now.
    // Later we should probably parse the whole sequence.
    var SourceImageSequence = instance[0x00082112];
    log.info('SourceImageSequence ' + SourceImageSequence);
    if (SourceImageSequence && SourceImageSequence.length) {
        return SourceImageSequence[0][0x00081155];
    }
}

/**
 * Parses result data from a DIMSE search into Study MetaData
 * Returns an object populated with study metadata, including the
 * series list.
 *
 * @param resultData
 * @returns {{seriesList: Array, patientName: *, patientId: *, accessionNumber: *, studyDate: *, modalities: *, studyDescription: *, imageCount: *, studyInstanceUid: *}}
 */
function resultDataToStudyMetadata(studyInstanceUid, resultData) {
    var seriesMap = {};
    var seriesList = [];

    if (!resultData.length) {
        return;
    }

    var anInstance = resultData[0].toObject();
    if (!anInstance) {
        return;
    }

    var studyData = {
        seriesList: seriesList,
        patientName: anInstance[0x00100010],
        patientId: anInstance[0x00100020],
        accessionNumber: anInstance[0x00080050],
        studyDate: anInstance[0x00080020],
        modalities: anInstance[0x00080061],
        studyDescription: anInstance[0x00081030],
        imageCount: anInstance[0x00201208],
        studyInstanceUid: anInstance[0x0020000D]
    };

    resultData.forEach(function(instanceRaw) {
        var instance = instanceRaw.toObject();
        var seriesInstanceUid = instance[0x0020000E];
        var series = seriesMap[seriesInstanceUid];
        if (!series) {
            series = {
                seriesDescription: instance[0x0008103E],
                modality: instance[0x00080060],
                seriesInstanceUid: seriesInstanceUid,
                seriesNumber: parseFloat(instance[0x00200011]),
                instances: []
            };
            seriesMap[seriesInstanceUid] = series;
            seriesList.push(series);
        }

        var sopInstanceUid = instance[0x00080018];

        log.info('instance');
        log.info(instance);
        var instanceSummary = {
            imageType: instance[0x00080008],
            sopClassUid: instance[0x00080016],
            sopInstanceUid: sopInstanceUid,
            instanceNumber: parseFloat(instance[0x00200013]),
            imagePositionPatient: instance[0x00200032],
            imageOrientationPatient: instance[0x00200037],
            frameOfReferenceUID: instance[0x00200052],
            sliceLocation: parseFloat(instance[0x00201041]),
            samplesPerPixel: parseFloat(instance[0x00280002]),
            photometricInterpretation: instance[0x00280004],
            rows: parseFloat(instance[0x00280010]),
            columns: parseFloat(instance[0x00280011]),
            pixelSpacing: instance[0x00280030],
            bitsAllocated: parseFloat(instance[0x00280100]),
            bitsStored: parseFloat(instance[0x00280101]),
            highBit: parseFloat(instance[0x00280102]),
            pixelRepresentation: parseFloat(instance[0x00280103]),
            windowCenter: instance[0x00281050],
            windowWidth: instance[0x00281051],
            rescaleIntercept: parseFloat(instance[0x00281052]),
            rescaleSlope: parseFloat(instance[0x00281053]),
            sourceImageInstanceUid: getSourceImageInstanceUid(instance),
            laterality: instance[0x00200062],
            viewPosition: instance[0x00185101],
            numFrames: parseFloat(instance[0x00280008]),
            frameRate: parseFloat(instance[0x00181063])
        };

        var host = Meteor.settings.dimse.host,
            port = Meteor.settings.dimse.port;

        var serverRoot = host + ':' + port;

        instanceSummary.wadorsuri = serverRoot + '/studies/' + studyInstanceUid + '/series/' + seriesInstanceUid + '/instances/' + sopInstanceUid + '/frames/1';

        series.instances.push(instanceSummary);
    });

    return studyData;
}

/**
 * Retrieved Study MetaData from a DICOM server using DIMSE
 * @param studyInstanceUid
 * @returns {{seriesList: Array, patientName: *, patientId: *, accessionNumber: *, studyDate: *, modalities: *, studyDescription: *, imageCount: *, studyInstanceUid: *}}
 */
Services.DIMSE.RetrieveMetadata = function(studyInstanceUid) {
    console.log('DIMSE RetrieveMetadata');

    var result = DIMSE.retrieveInstances(studyInstanceUid, null, {
        0x00080050: '',
        0x00080061: '',
        0x00081030: '',
        0x00201208: '',
        0x00080060: '',
        0x00080008: '',
        0x00200032: '',
        0x00200037: '',
        0x00200052: '',
        0x00201041: '',
        0x00280002: '',
        0x00280004: '',
        0x00280030: '',
        0x00280100: '',
        0x00280101: '',
        0x00280102: '',
        0x00280103: '',
        0x00281050: '',
        0x00281051: '',
        0x00281052: '',
        0x00281053: '',
        0x00200062: '',
        0x00185101: '',
        0x00280008: '',
        0x00181063: '',
        0x00082112: ''
    });

    var study = resultDataToStudyMetadata(studyInstanceUid, result);
    if (!study) {
        study = {};
    }

    study.studyInstanceUid = studyInstanceUid;

    console.log(study);
    console.log(study.seriesList[0].instances[0]);
    return study;
};