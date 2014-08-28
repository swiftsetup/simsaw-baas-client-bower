define(
    [
        'angular',
        'config',
        'simsaw/local_storage'
    ],
    function (angular, config) {
        'use strict';

        var baas = angular.module('simsaw-baas', ['simsaw-baas-local-storage']);

        baas.config(['$httpProvider', function ($httpProvider) {
            $httpProvider.defaults.useXDomain = true;
            delete $httpProvider.defaults.headers.common['X-Requested-With'];

            $httpProvider.responseInterceptors.push('loadingHttpInterceptor');
        }]);

        baas.factory(
            'loadingHttpInterceptor',
            [
                '$q',
                '$rootScope',
                function ($q, $rootScope) {

                    function success(response) {
                        $rootScope.isLoading--;
                        return response;
                    }

                    function error(response) {
                        $rootScope.isLoading--;

                        //response => {data: '', status: '', headers: '', config: ''}
                        switch (response.status) {
                        case 401:
                            $rootScope.$broadcast('request-error-401');
                            break;
                        }
                        return $q.reject(response);
                    }

                    return function (promise) {
                        if (!$rootScope.isLoading) {
                            $rootScope.isLoading = 0;
                        }
                        $rootScope.isLoading++;
                        return promise.then(success, error);
                    };
                }
            ]
        );

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
                'simsaw-baas-local-storage',
                'simsaw-baas-settings',
                function ($http, storage, settings) {

                    function toJson(obj, pretty) {
                        return JSON.stringify(obj, undefined, pretty ? '  ' : null);
                    }

                    return function (method, route, data, params, cb) {

                        var installId = storage.getItem('installId'),
                            token = storage.getItem('auth');

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
                            cache: false,
                            withCredentials: false
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
                                cb(null, data);
                            })
                            .error(function (data, status) {
                                switch (status) {
                                case 0:
                                    cb('Server is not reachable, please try again', null);
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
                    $rootScope.alerts.push({ type: 'error alert-danger', msg: msg});
                    this.removeAfterInterval();
                },
                remove: function (index) {
                    $rootScope.alerts.splice(index, 1);
                },
                removeAfterInterval: function () {
                    setTimeout(function (idx) {
                        $rootScope.alerts.splice(idx, 1);
                    }, 3000);
                }
            };
        }]);

        return baas;
    }
);