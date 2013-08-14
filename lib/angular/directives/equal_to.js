define(['app'], function (app) {
    app.directive("equalTo", function () {
        return {
            require: "ngModel",
            link: function (scope, elem, attrs, ctrl) {
                var otherInput = elem.inheritedData("$formController")[attrs.equalTo];

                ctrl.$parsers.push(function (value) {
                    if (value === otherInput.$viewValue) {
                        ctrl.$setValidity("equalto", true);
                        return value;
                    }
                    ctrl.$setValidity("equalto", false);
                });

                otherInput.$parsers.push(function (value) {
                    ctrl.$setValidity("equalto", value === ctrl.$viewValue);
                    return value;
                });
            }
        };
    });
});