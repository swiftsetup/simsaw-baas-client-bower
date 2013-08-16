define(
    [
        'angular',
        'config',
        'simsaw/cookies'
    ],
    function (angular, config) {
        'use strict';

        var baas = angular.module('simsaw-baas', ['ngCookies']);

        baas.config(['$httpProvider', function ($httpProvider) {
            $httpProvider.defaults.useXDomain = true;
            delete $httpProvider.defaults.headers.common['X-Requested-With'];
            $httpProvider.responseInterceptors.push('myHttpInterceptor');
        }]);

        baas.factory('myHttpInterceptor', ['$q', '$rootScope', function ($q, $rootScope) {
            return function (promise) {
                $rootScope.isLoading = true;
                return promise.then(function (response) {
                    $rootScope.isLoading = false;
                    return response;
                }, function (response) {
                    $rootScope.isLoading = false;
                    return $q.reject(response);
                });
            };
        }]);

        baas.factory(
            'simsaw-baas-settings',
            function () {
                var baasUrl,
                    host = '',
                    port = '',
                    settings = config.simsawBaas.settings();

                if (settings.live) {
                    host = 'https://baas.simsaw.com';
                    baasUrl = host + '/' + settings.appId;
                } else {
                    host = 'http://localhost';
                    port = '3301';
                    baasUrl = host + ':' + port + '/' + settings.appId;
                }
                return {
                    env: settings.env,
                    afterLoginUri: config.afterLoginUri,
                    host: host,
                    port: port,
                    baasUrl: baasUrl
                };
            }
        );

        baas.factory(
            'simsaw-baas-request',
            [
                '$http',
                '$rootScope',
                '$cookieStore',
                'simsaw-baas-settings',
                function ($http, $rootScope, $cookieStore, settings) {
                    $rootScope.isLoading = false;

                    function toJson(obj, pretty) {
                        return JSON.stringify(obj, undefined, pretty ? '  ' : null);
                    }

                    return function (method, route, data, params, cb) {

                        $rootScope.isLoading = true;

                        var installId = $cookieStore.get('installId'),
                            token = $cookieStore.get('auth');

                        if (!cb && typeof params === 'function') {
                            cb = params;
                            params = null;
                        } else if (!cb && typeof data === 'function') {
                            cb = data;
                            data = null;
                            params = null;
                        }

                        if (token && typeof token === 'string') {
                            $http.defaults.headers.common.authorization = token;
                        }

                        if (installId) {
                            $http.defaults.headers.common['X-SS-BAAS-INSTALL-ID'] = installId;
                        }

                        var props = {
                            method: angular.uppercase(method),
                            url: settings.baasUrl + '/' + route,
                            data: data,
                            params: params,
                            cache: false
                        };

                        // make angular to not skip object properties starting with $.
                        // we are using it while querying simsaw-baas
                        if (data && data.query) {

                            props.transformRequest = [function (d) {
                                return angular.isObject(d) ? toJson(d) : d;
                            }];
                        }


                        $http(props)
                            .success(function (data) {
                                $rootScope.isLoading = false;
                                cb(null, data);
                            })
                            .error(function (data, status) {
                                $rootScope.isLoading = false;
                                switch (status) {
                                    case 0:
                                        cb('Can not connect with server', null);
                                        break;
                                    default:
                                        if (data.err) {
                                            var err = data.err;
                                            if (err.err) {
                                                cb(data.err);
                                            } else if (err.lastErrorObject) {
                                                cb(err.lastErrorObject.err);
                                            } else {
                                                cb(err);
                                            }
                                        } else {
                                            cb(data);
                                        }
                                }
                            });
                    };
                }
            ]
        );

        baas.factory('Alert', ['$rootScope', function ($rootScope) {
            $rootScope.alerts = [];
            return {
                alerts: $rootScope.alerts,
                success: function (msg) {
                    $rootScope.alerts.push({ type: 'success', msg: msg });
                    this.removeAfterInterval();
                },
                info: function (msg) {
                    $rootScope.alerts.push({ type: 'info', msg: msg});
                    this.removeAfterInterval();
                },
                warning: function (msg) {
                    $rootScope.alerts.push({ type: 'warning', msg: msg });
                    this.removeAfterInterval();
                },
                error: function (msg) {
                    $rootScope.alerts.push({ type: 'error', msg: msg });
                    this.removeAfterInterval();
                },
                remove: function (index) {
                    $rootScope.alerts.splice(index, 1);
                },
                removeAfterInterval: function () {
                    var self = this,
                        idx = self.alerts.length - 1,
                        interval = 3000;

                    setTimeout(function (idx) {
                        $rootScope.alerts.splice(idx, 1);
                    }, interval);
                }
            };
        }]);

        return baas;
    }
);