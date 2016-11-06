Package.describe({
    name: 'ohif:measurements',
    summary: 'OHIF Measurement Tools',
    version: '0.0.1'
});

Package.onUse(function(api) {
    api.versionsFrom('1.4');

    api.use('ecmascript');
    api.use('standard-app-packages');
    api.use('jquery');
    api.use('stylus');
    api.use('random');

    api.use('validatejs');

    // Schema for Data Models
    api.use('aldeed:simple-schema');
    api.use('aldeed:collection2');

    // Template overriding
    api.use('aldeed:template-extension@4.0.0');

    // Our custom packages
    api.use('ohif:cornerstone');
    api.use('design');
    api.use('ohif:core');
    api.use('ohif:log');
    api.use('ohif:study-list');

    // Client and server imports
    api.addFiles('both/index.js', ['client', 'server']);

    // Client imports
    api.addFiles('client/index.js', 'client');

    api.export('MeasurementSchemaTypes', ['client', 'server']);
});
