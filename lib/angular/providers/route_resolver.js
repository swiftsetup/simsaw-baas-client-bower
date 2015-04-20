define(function (require) {
    'use strict';
    var app = require('app');

    app.provider('routeResolver', function () {
        this.$get = function () {
            return this;
        };

        this.route = function () {

            var resolve = function (templateUrl, controllerName, dependenciesArray, accessNumber, reloadOnSearch) {
                    var routeDef = {};

                    routeDef.templateUrl = templateUrl;
                    routeDef.controller = controllerName;
                    routeDef.access = accessNumber;
                    routeDef.resolve = {
                        load: ['$q', '$rootScope', function ($q, $rootScope) {
                            return resolveDependencies($q, $rootScope, dependenciesArray);
                        }]
                    };
                    routeDef.reloadOnSearch = !_.isUndefined(reloadOnSearch) ? reloadOnSearch : true;

                    return routeDef;
                },

                resolveDependencies = function ($q, $rootScope, dependencies) {
                    if (!$rootScope.isLoading) {
                        $rootScope.isLoading = 0;
                    }

                    $rootScope.isLoading++;

                    var defer = $q.defer();
                    require(dependencies, function () {
                        $rootScope.isLoading--;
                        defer.resolve();
                        $rootScope.$apply();
                    });

                    return defer.promise;
                };

            return {
                resolve: resolve
            };
        }();
    });
});