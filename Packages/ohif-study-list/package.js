Package.describe({
    name: 'ohif:study-list',
    summary: 'Basic study list for web-based DICOM viewers',
    version: '0.0.1'
});

Package.onUse(function(api) {
    api.versionsFrom('1.4');

    api.use('ecmascript');
    api.use('standard-app-packages');
    api.use('jquery');
    api.use('stylus');
    api.use('http');
    api.use('random');
    api.use('silentcicero:jszip');
    api.use('aldeed:simple-schema');
    api.use('accounts-base');
    api.use('mrt:moment');
    api.use('aldeed:collection2');

    // Note: MomentJS appears to be required for Bootstrap3 Datepicker, but not a dependency for some reason
    api.use('momentjs:moment');

    api.use('gilbertwat:bootstrap3-daterangepicker');

    // Our custom packages
    api.use('design');
    api.use('ohif:core');
    api.use('ohif:dicom-services');
    api.use('ohif:viewerbase');
    api.use('ohif:wadoproxy');

    // TODO: Replace with NPM dependency
    api.use('ohif:cornerstone'); // Only for HammerJS

    // Client and server imports
    api.addFiles('both/index.js', [ 'client', 'server' ]);

    // Server imports
    api.addFiles('server/index.js', 'server');

    // Client imports
    api.addFiles('client/index.js', 'client');

    // Export Servers and CurrentServer Collections
    api.export('Servers', ['client', 'server']);
    api.export('CurrentServer', ['client', 'server']);

    // Export shared lib functions
    api.export('getCurrentServer', ['client', 'server']);

    api.export('Services', 'server');

    // Export StudyList helper functions for usage in Routes
    api.export('getStudyMetadata', 'client');
    api.export('openNewTab', 'client');
    api.export('switchToTab', 'client');
    api.export('StudyList');

    // Export the global ViewerData object
    api.export('ViewerData', 'client');

    // Export the Collections
    api.export('StudyListStudies', 'client');
    api.export('StudyListSelectedStudies', 'client');
});
