define(['angular'], function (angular) {
    'use strict';

    var baasData = angular.module('simsaw-baas-endpoint', ['simsaw-baas']);

    baasData.factory(
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
                        baasRequest('POST', route, {model: model}, cb);
                    },
                    put: function (endpointName, model, params, cb) {
                        var route = 'endpoint/' + endpointName;
                        baasRequest('PUT', route, {model: model}, cb);
                    },
                    delete: function (endpointName, params, cb) {
                        var route = 'endpoint/' + endpointName;
                        baasRequest('DELETE', route, null, cb);
                    }
                };
            }
        ]
    );
});