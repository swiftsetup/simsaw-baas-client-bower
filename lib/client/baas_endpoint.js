define(['angular'], function (angular) {
    'use strict';

    var baasEndpoint = angular.module('simsaw-baas-endpoint', ['simsaw-baas']);

    baasEndpoint.factory(
        'simsaw-baas-endpoint',
        [
            '$resource',
            'simsaw-baas-request',
            'Alert',
            function ($resource, baasRequest, Alert) {
                return {
                    get: function (endpointName, params, cb) {
                        var route = 'endpoint/' + endpointName;
                        baasRequest('GET', route, null, params, cb);
                    },
                    post: function (endpointName, model, params, cb) {
                        var route = 'endpoint/' + endpointName;
                        baasRequest('POST', route, {model: model}, params, cb);
                    },
                    put: function (endpointName, model, params, cb) {
                        var route = 'endpoint/' + endpointName;
                        baasRequest('PUT', route, {model: model}, params, cb);
                    },
                    delete: function (endpointName, params, cb) {
                        var route = 'endpoint/' + endpointName;
                        baasRequest('DELETE', route, null, params, cb);
                    }
                };
            }
        ]
    );

    baasEndpoint.directive(
        'simsawBaasEndpointLink',
        [
            'simsaw-baas-settings',
            'simsaw-baas-auth',
            '$rootScope',
            function (baasSettings, Auth, $rootScope) {
                return {
                    restrict: 'A',
                    scope: {},
                    link: function (scope, elem, attrs) {
                        var endpointName = attrs.simsawBaasEndpointLink,
                            url;

                        function changeUrl(token) {
                            url = baasSettings.baasUrl + '/endpoint/' + endpointName +
                                (endpointName.indexOf('?') < 0 ? '?' : '&') + 'access_token=' + token || '';
                            elem.attr('href', url);
                        }

                        Auth.getUserInfo().then(function (user) {
                            changeUrl(user.authToken);
                        });

                        $rootScope.$on('auth-set-token', function (event, token) {
                            changeUrl(token);
                        });

                        $rootScope.$on('auth-logout', function (event, data) {
                            changeUrl();
                        });
                    }
                };
            }
        ]
    );
});