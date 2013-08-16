define(function (require) {
    'use strict';
    var app = require('app');

    app.provider('routeResolver', function () {
        this.$get = function () {
            return this;
        };

        this.route = function () {

            var resolve = function (template, controller, dependencies, access) {
                    var routeDef = {};
                    routeDef.templateUrl = '/templates/' + template;
                    routeDef.controller = controller;
                    routeDef.access = access;
                    routeDef.resolve = {
                        load: ['$q', '$rootScope', function ($q, $rootScope) {
                            return resolveDependencies($q, $rootScope, dependencies);
                        }]
                    };

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