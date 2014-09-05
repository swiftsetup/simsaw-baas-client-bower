/**
 * Broadcast
 *  $rootScope.$broadcast('auth-logout');
 */
define(['angular', 'simsaw/utils', 'config'], function (angular, utils, config) {
    'use strict';

    var baasAuth = angular.module('simsaw-baas-auth', ['simsaw-baas']);

    // For client side auth ref visit
    // http://www.frederiknakstad.com/authentication-in-single-page-applications-with-angular-js/
    baasAuth.factory(
        'simsaw-baas-auth',
        [
            '$window',
            '$location',
            'simsaw-baas-local-storage',
            '$rootScope',
            '$q',
            'simsaw-baas-request',
            'Alert',
            function ($window, $location, storage, $rootScope, $q, baasRequest, Alert) {

                var processQueue = {
                    isRunning: false,
                    promises: []
                };

                $rootScope.user =  { username: ''};

                function clearUser() {
                    if (!$rootScope.user) {
                        $rootScope.user = {};
                    }

                    var prop;
                    for (prop in $rootScope.user) {
                        $rootScope.user[prop] = null;
                    }
                    $rootScope.user.role = 1;
                }

                function setUser(data) {
                    $rootScope.user.id = data._id;
                    $rootScope.user.name = data.name;
                    $rootScope.user.username = data.username;
                    $rootScope.user.role = data.role;

                    var prop;
                    for (prop in config.userInfoProjection) {
                        $rootScope.user[prop] = data[prop];
                    }
                }

                function getUserInfo() {
                    var token = storage.getItem('auth'),
                        deferred = $q.defer();

                    if (token && !$rootScope.user.id) {

                        // queue all requests
                        processQueue.promises.push(deferred);

                        // call server if not called already, otherwise wait
                        if (!processQueue.isRunning) {
                            processQueue.isRunning = true;
                            baasRequest(
                                'get',
                                'auth/info',
                                null,
                                config.userInfoProjection,
                                function (err, data) {
                                    if (err) {
                                        clearUser();
                                    } else {
                                        setUser(data);
                                    }

                                    processQueue.isRunning = false;
                                    $rootScope.user.authToken = token;

                                    // resolve queued promises.
                                    processQueue.promises.forEach(function (def) {
                                        def.resolve($rootScope.user);
                                    });
                                }
                            );
                        }
                    } else {
                        $rootScope.user.authToken = token;
                        deferred.resolve($rootScope.user);
                    }
                    return deferred.promise;
                }


                // to pull info onLoad or page refresh
                getUserInfo().then(function () {
                    // empty on cause;
                });

                // listener for unauthorized access
                $rootScope.$on('request-error-401', function () {
                    storage.removeItem('auth');
                    clearUser();
                    Alert.error('Expired user session, please login again.');
                    $location.path('/');
                });

                // Auth service
                return {
                    user: function () {
                        return $rootScope.user;
                    },
                    register: function (user, success, cb) {
                        var self = this;
                        if (!cb) {
                            if (typeof success === 'function') {
                                cb = success;
                                success = true;
                            } else if (typeof user === 'function') {
                                cb = user;
                                user = null;
                            }
                        }

                        if (!user) {
                            return cb('user model is null');
                        }

                        baasRequest('post', 'auth/register', {model: user, loginOnSuccess: success}, function (err, data) {
                            if (err) {
                                cb(err);
                            } else {
                                if (success) {
                                    setUser(data);
                                    self.setAuthToken('#token_type=bearer&access_token=' + data.token);
                                }
                                cb(null, data);
                            }
                        });
                    },
                    changePassword: function (model, cb) {
                        baasRequest('put', 'auth/password', {model: model}, cb);
                    },
                    forgotPassword: function (username, emailTemplate) {
                        var deferred;
                        deferred = $q.defer();
                        baasRequest('post', 'auth/forgot-password', {username: username, emailTemplate: emailTemplate}, function (err, fpwdRes) {
                            if (err) {
                                deferred.reject(err);
                            } else {
                                deferred.resolve();
                            }
                        });
                        return deferred.promise;
                    },
                    setAuthToken: function (locationHash, isUseLocalStore) {
                        var params = utils.getHashParams(locationHash),
                            token = '';
                        if (params.err) {
                            // remove session if any on failed attempt
                            storage.removeItem('auth');
                            Alert.error(params.err);
                        } else {
                            token = params.token_type + ' ' + params.access_token;

                            clearUser();

                            storage.setItem('auth', token, isUseLocalStore);

                            $rootScope.$broadcast('auth-set-token', token);

                            this.getUserInfo()
                                .then(function (user) {
                                    if (config.isWinLocationOnLogin) {
                                        $window.location = config.homePages[user.role];

                                    } else {
                                        $location.path(config.homePages[user.role]);
                                    }
                                });
                        }
                    },
                    getAuthToken: function () {
                        var deferred = $q.defer(),
                            token = storage.getItem('auth');

                        if (token && $rootScope.user.id) {
                            deferred.resolve(token);
                        } else {
                            deferred.reject('Expired user session, please login again.');
                        }
                        return deferred.promise;
                    },
                    socialLogin: function (data) {
                        switch (data.code) {
                            case 1: // fb account is linked to a user
                            case 2: // new fb account, registered and loged user in
                            case 3: // new fb account, username already used by logged in user
                                this.setAuthToken('#access_token=' + data.token + '&token_type=bearer');
                                break;
                            case 4: // new fb account, username conflict
                                Alert.warning('Account is already linked with another user.');
                                break;
                            case 5: // new fb account, username conflict
                                Alert.warning('"Username/email is already in use. Please login to' +
                                    ' that account, goto My Account section and link a provider to your account');
                                break;
                        }
                    },
                    authorize: function (accessLevel) {
                        var deferred = $q.defer();

                        this.getUserInfo().then(function (user) {
                            var role = user.role || 1;
                            deferred.resolve((accessLevel & role) === role);
                        });

                        return deferred.promise;
                    },
                    isLoggedIn: function () {
                        var flag = $rootScope.user && $rootScope.user.id;
                        return flag;
                    },
                    logOut: function (locationPath) {
                        baasRequest('delete', 'auth/logout', null, function (err) {
                            if (err) {
                                Alert.error('Error on logging you out.');
                            } else {
                                storage.removeItem('auth');
                                clearUser();
                                $rootScope.$broadcast('auth-logout');

                                if (config.isWinLocationOnLogin) {
                                    $window.location = locationPath || '/';
                                } else {
                                    $location.path(locationPath || '/');
                                }
                            }
                        });
                    },
                    removeCustomHttpHeader: function (http) {
                        // remove header as it can be sent over to fb call
                        delete http.defaults.headers.common.authorization;
                        delete http.defaults.headers.common['X-SS-BAAS-INSTALL-ID'];
                    },
                    getUserInfo: getUserInfo
                };
            }
        ]
    );

    baasAuth.run(
        ['$rootScope', '$location', '$log', 'simsaw-baas-auth',
            function ($rootScope, $location, $log, Auth) {
                if (Auth) {
                    // to allow the role based view access.
                    $rootScope.$on("$routeChangeStart", function (event, next, current) {
                        var accessLevel = next.access || 1;
                        if (accessLevel > 1) {
                            Auth.authorize(accessLevel).then(function (allowed) {
                                if (!allowed) {
                                    $log.warn('You have no access to this route.');
                                    $location.path('/');
                                }
                            });
                        }
                    });
                }
            }
        ]
    );

    baasAuth.directive(
        'simsawBaasLogin',
        [
            '$location',
            '$rootScope',
            'simsaw-baas-auth',
            'simsaw-baas-settings',
            'Alert',
            function ($location, $rootScope, Auth, settings, Alert) {
                var host = $location.protocol() + '://' + $location.host() + ($location.port() && $location.port() !== 80  ? ':' + $location.port() : '');

                return {
                    restrict: 'AC',
                    template: '<div>' +
                        '<form name="loginFrm" action="' + settings.baasUrl + '/auth/login" method="POST" target="baasLoginFrame">' +
                        '<div ng-transclude></div>' +
                        '<input type="hidden" name="redirect_uri" value="' + host + '/ss_auth_callback.html">' +
                        '</form>' +
                        '<iframe name="baasLoginFrame" style="width: 0; height: 0; border: none; display: none;"></iframe>' +
                        '</div>',
                    transclude: true,
                    scope: {},
                    link: function (scope, element) {
                        var frm     = element.parent().find('form'),
                            inputs  = frm.find('input'),
                            iframe  = element.parent().find('iframe'),
                            i       = 0,
                            submitBtn,
                            pwdElem,
                            rememberMe,
                            input,
                            inputType;

                        for (i; i < inputs.length; i++) {
                            input       = inputs[i];
                            inputType   = input.type.toLowerCase();

                            if (inputType === 'submit') {
                                submitBtn = angular.element(input);
                            } else if (inputType === 'checkbox' && input.name === "rememberMe") {
                                rememberMe = angular.element(input);
                            } else if (inputType === 'password' && input.name === "password") {
                                pwdElem = angular.element(input);
                            }
                        }

                        if (!submitBtn) {
                            var btns = frm.find('button'),
                                btn;

                            i = 0;

                            for (i; i < btns.length; i++) {
                                btn = btns[i];
                                if (btn.type.toLowerCase() === 'submit') {
                                    submitBtn = angular.element(btn);
                                    break;
                                }
                            }
                        }

                        if (!submitBtn) {
                            Alert.warning('Submit button not found for login form');
                        }

                        // Form submit
                        frm.bind('submit', function () {
                            submitBtn.attr('disabled', 'disabled');
                            $rootScope.$apply(function () {
                                $rootScope.isLoading++;
                            });
                        });

                        // Bind iframe event
                        iframe.bind('load', function () {
                            var win = iframe[0].contentWindow || (iframe[0].contentDocument.document || iframe[0].contentDocument);

                            // get content
                            var content = angular.element(win.document.body).html();
                            if (content && content !== "") {

                                var params = utils.getHashParams(content);
                                if (params.err && pwdElem) {   // clean pwd on error
                                    pwdElem.val('');
                                }

                                $rootScope.$apply(function () {
                                    Auth.setAuthToken(content, (rememberMe && rememberMe[0].checked));
                                    $rootScope.isLoading--;
                                });
                            }
                            submitBtn.attr('disabled', null);
                        });
                    }
                };

            }
        ]
    );
    return baasAuth;
});