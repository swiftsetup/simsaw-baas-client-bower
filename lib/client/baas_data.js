define(['angular'], function (angular) {
    'use strict';

    var baasData = angular.module('simsaw-baas-data', ['simsaw-baas']);

    baasData.factory(
        'simsaw-baas-data',
        [
            '$resource',
            'simsaw-baas-request',
            'Alert',
            function ($resource, baasRequest, Alert) {

                function findData(collectionName, query, projection, cb) {
                    var route = 'data/' + collectionName + '/find';
                    baasRequest('POST', route, {query: query, projection: projection}, cb);
                }

                function saveData(collectionName, model, cb) {
                    var route = 'data/' + collectionName;
                    baasRequest('POST', route, {model: model}, cb);
                }

                function updateData(collectionName, id, model, cb) {
                    var route = 'data/' + collectionName + '/' + id;
                    baasRequest('PUT', route, {model: model}, cb);
                }

                function removeData(collectionName, id, cb) {
                    var route = 'data/' + collectionName + '/' + id;
                    baasRequest('DELETE', route, null, cb);
                }

                return {
                    find: findData,
                    save: saveData,
                    update: updateData,
                    remove: removeData
                };
            }
        ]
    );
});