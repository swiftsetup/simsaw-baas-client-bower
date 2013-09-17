define(['angular'], function (angular) {
    'use strict';

    var baasData = angular.module('simsaw-baas-data', ['simsaw-baas']);

    baasData.factory(
        'simsaw-baas-data',
        [
            '$resource',
            'simsaw-baas-request',
            function ($resource, baasRequest) {

                function countData(collectionName, cb) {
                    var route = 'data/' + collectionName + '/count';
                    baasRequest('GET', route, cb);
                }

                function find(collectionName, query, projection, isOne, cb) {
                    if (!cb) {
                        if (typeof projection === 'function') {
                            cb = projection;
                            projection = null;
                        } else if (typeof query === 'function') {
                            cb = query;
                            query = null;
                        } else if (typeof collectionName === 'function') {
                            cb = collectionName;
                            collectionName = null;
                        }
                    }

                    if (!collectionName) {
                        return cb('Collection name is required');
                    }

                    var route = 'data/' + collectionName + '/find' + (isOne ? '?isFindOne=1' : '');
                    baasRequest('POST', route, {query: query, projection: projection}, cb);
                }

                function findAll(collectionName, query, projection, cb) {

                    find(collectionName, query, projection, false, cb);
                }

                function findOne(collectionName, query, projection, cb) {
                    find(collectionName, query, projection, true, cb);
                }

                function saveData(collectionName, model, cb) {
                    if (!cb) {
                        if (typeof model === 'function') {
                            cb = model;
                            model = null;
                        } else if (typeof collectionName === 'function') {
                            cb = collectionName;
                            collectionName = null;
                        }
                    }

                    if (!collectionName) {
                        return cb('Collection name is required');
                    }

                    if (!model) {
                        return cb('Model is null');
                    }

                    var route = 'data/' + collectionName;
                    baasRequest('POST', route, {model: model}, cb);
                }

                function updateData(collectionName, id, model, cb) {
                    if (!cb) {
                        if (typeof model === 'function') {
                            cb = model;
                            model = null;
                        } else if (typeof id === 'function') {
                            cb = id;
                            id = null;
                        } else if (typeof collectionName === 'function') {
                            cb = collectionName;
                            collectionName = null;
                        }
                    }

                    if (!collectionName) {
                        return cb('Collection name is required');
                    }

                    if (!id) {
                        return cb('Param id is null');
                    }

                    var route = 'data/' + collectionName + '/' + id;
                    baasRequest('PUT', route, {model: model}, cb);
                }

                function removeData(collectionName, id, cb) {

                    if (!cb) {
                        if (typeof id === 'function') {
                            cb = id;
                            id = null;
                        } else if (typeof collectionName === 'function') {
                            cb = collectionName;
                            collectionName = null;
                        }
                    }

                    if (!collectionName) {
                        return cb('Collection name is required');
                    }

                    if (!id) {
                        return cb('Param idOrQuery is null');
                    }

                    var route = 'data/' + collectionName + '/' + id;
                    baasRequest('DELETE', route, cb);
                }

                return {
                    count: countData,
                    find: findAll,
                    findOne: findOne,
                    save: saveData,
                    update: updateData,
                    remove: removeData
                };
            }
        ]
    );
});