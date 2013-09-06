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
            '$cookieStore',
            function (baasSettings, $cookieStore) {
                return {
                    restrict: 'A',
                    scope: {},
                    link: function (scope, elem, attrs) {
                        var endpointName = attrs.simsawBaasEndpointLink,
                            url = baasSettings.baasUrl + '/endpoint/' + endpointName +
                                (endpointName.indexOf('?') < 0 ? '?' : '&') + 'access_token=' + $cookieStore.get('auth');
                        elem.attr('href', url);
                    }
                };
            }
        ]
    );
});