define(['app'], function (app) {
    "use strict";
    app.directive(
        'defaultFocus',
        [function () {
            return {
                restrict: 'A',
                link: function (scope, ele) {
                    ele[0].focus();
                }
            };
        }]
    );
});