define(['angular'], function (angular) {
    'use strict';

    var storage = angular.module('simsaw-baas-local-storage', ['ng']);

    storage.factory(
        'simsaw-baas-local-storage',
        [
            '$window',
            '$log',
            function ($window, $log) {

                function WebStorage(type) {
                    this.type   = type;
                    this.store  = type === 'local' ? $window.localStorage : $window.sessionStorage;

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

                var isSupportWebStorage =  (Storage !== "undefined"),
                    localStore,
                    sessionStore;

                if (!isSupportWebStorage) {
                    $log.error('Web storage is not supported');
                } else {
                    localStore =  new WebStorage('local');
                    sessionStore =  new WebStorage();
                }

                return {
                    setItem: function (name, value, isUseLocalStore) {
                        $log.info('save to Local: ', isUseLocalStore)

                        if (!localStore || !sessionStore) { return; }

                        if (isUseLocalStore) {
                            localStore.setItem(name, value);
                            sessionStore.removeItem(name);              // remove item from session
                        } else {
                            sessionStore.setItem(name, value);
                        }
                    },
                    getItem: function (name) {
                        if (!sessionStore) { return; }
                        return sessionStore.getItem(name) || localStore.getItem(name);
                    },
                    removeItem: function (name) {
                        if (!localStore || !sessionStore) { return; }
                        localStore.removeItem(name);
                        sessionStore.removeItem(name);
                    }
                };
            }
        ]
    );

});