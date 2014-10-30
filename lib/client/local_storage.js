define(['angular'], function (angular) {
    'use strict';

    var storage = angular.module('simsaw-baas-local-storage', ['ng']);

    storage.factory(
        'simsaw-baas-local-storage',
        [
            function () {

                function WebStorage(type) {
                    this.type   = type;
                    this.store  = type === 'local' ? window.localStorage : window.sessionStorage;

                    function preFixed(name) {
                        return 'sim-' + name;
                    }

                    this.getItem = function (name) {
                        return this.store.getItem(preFixed(name));
                    };

                    this.setItem = function (name, value) {
                        return this.store.setItem(preFixed(name), value);
                    };

                    this.removeItem = function (name) {
                        return this.store.removeItem(preFixed(name));
                    };
                }

                var localStore =  new WebStorage('local');

                return {
                    setItem: function (name, value) {
                        localStore.setItem(name, value);
                    },
                    getItem: function (name) {
                        return localStore.getItem(name);
                    },
                    removeItem: function (name) {
                        localStore.removeItem(name);
                    }
                };
            }
        ]
    );

});