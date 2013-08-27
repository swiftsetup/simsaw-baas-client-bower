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
            '$location',
            '$cookieStore',
            '$rootScope',
            '$q',
            'simsaw-baas-settings',
            'simsaw-baas-request',
            'Alert',
            function ($location, $cookieStore, $rootScope, $q, settings, baasRequest, Alert) {

                $rootScope.user =  { username: ''};

                function clearUser() {
                    $rootScope.user.id = null;
                    $rootScope.user.name = '';
                    $rootScope.user.username = '';
                    $rootScope.user.role = 1;
                    $cookieStore.remove('auth');
                    $rootScope.$broadcast('auth-logout');
                }

                function setUser(data) {
                    $rootScope.user.id = data._id;
                    $rootScope.user.name = data.name;
                    $rootScope.user.username = data.username;
                    $rootScope.user.role = data.role;
                }

                function getUserInfo(projection) {
                    var token = $cookieStore.get('auth'),
                        deferred = $q.defer();
                    if (token && !$rootScope.user.id) {
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
                                deferred.resolve($rootScope.user);
                            }
                        );
                    } else {
                        deferred.resolve($rootScope.user);
                    }
                    return deferred.promise;
                }


                // to pull info onLoad or page refresh
                getUserInfo().then(function (user) {
                    //console.log('pulled user info');
                });

                // listener for unauthorized access
                $rootScope.$on('request-error-401', function (event) {
                    clearUser();
                    Alert.error('Login session exired, please login again.');
                    $location.path('/');
                });

                // Auth service
                return {
                    user: function () {
                        return $rootScope.user;
                    },
                    register: function (user, cb) {
                        var self = this;
                        baasRequest('post', 'auth/register', {model: user, loginOnSuccess: true}, function (err, data) {
                            if (err) {
                                cb(err);
                            } else {
                                setUser(data);
                                self.setAuthToken('#token_type=bearer&access_token=' + data.token);
                                cb(null, data);
                            }
                        });
                    },
                    changePassword: function (model, cb) {
                        baasRequest('put', 'auth/password', {model: model}, cb);
                    },
                    setAuthToken: function (locationHash) {
                        var params = utils.getHashParams(locationHash),
                            token = '';
                        if (params.err) {
                            // remove session if any on failed attempt
                            $cookieStore.remove('auth');
                            Alert.error(params.err);
                        } else {
                            token = params.token_type + ' ' + params.access_token;
                            $cookieStore.put('auth', token);
                            this.getUserInfo().then(function (user) {
                                console.dir(user);
                                $location.path(config.homePages[user.role]);
                            });
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
                    logOut: function () {
                        baasRequest('delete', 'auth/logout', null, function (err) {
                            if (err) {
                                Alert.error('Error on logging you out.');
                            } else {
                                clearUser();
                                $location.path('/');
                            }
                        });
                    },
                    getUserInfo: getUserInfo
                };
            }
        ]
    );

    baasAuth.factory(
        'simsaw-baas-auth-fb',
        [
            '$http',
            'simsaw-baas-auth',
            'simsaw-baas-settings',
            'simsaw-baas-request',
            'Alert',
            function ($http, Auth, settings, baasRequest, Alert) {
                var busy = false;

                function getId(cb) {
                    baasRequest('get', 'auth/facebook/key', null, cb);
                }

                function setAuthToken(token, expiresIn, role) {
                    busy = true;

                    // remove header as it can be sent over to fb call
                    delete $http.defaults.headers.common.authorization;
                    delete $http.defaults.headers.common['X-SS-BAAS-INSTALL-ID'];

                    //Pull profile
                    $http.get('https://graph.facebook.com/me?access_token=' + token)
                        .success(function (data) {
                            var user = {id: data.id, username: data.email, name: data.name, role: role};
                            baasRequest(
                                'post',
                                'auth/facebook/token',
                                {token: token, expiresIn: expiresIn, model: user},
                                function (err, data) {
                                    if (err) {
                                        Alert.error(err);
                                    } else {
                                        switch (data.code) {
                                            case 1: // fb account is linked to a user
                                            case 2: // new fb account, registered and loged user in
                                            case 3: // new fb account, username already used by logged in user
                                                Auth.setAuthToken('#access_token=' + token + '&token_type=bearer');
                                                break;
                                            case 4: // new fb account, username conflict
                                                Alert.warning('"' + user.username + '" is already in use. Please login to' +
                                                    ' that account, goto My Account section and link a provider to your account');
                                                break;
                                        }
                                    }
                                }
                            );
                        });
                }

                return {
                    isBusy: busy,
                    getFbAppId: getId,
                    setAuthToken: setAuthToken
                };
            }
        ]
    );


    baasAuth.factory(
        'simsaw-baas-auth-twitter',
        [
            '$http',
            'simsaw-baas-auth',
            'simsaw-baas-settings',
            'simsaw-baas-request',
            'Alert',
            function ($http, Auth, settings, baasRequest, Alert) {
                var busy = false;

                function getId(cb) {
                    baasRequest('get', 'auth/twitter/key', null, cb);
                }

                function setAuthToken(token, expiresIn, role) {
                    busy = true;

                    // remove header as it can be sent over to fb call
                    delete $http.defaults.headers.common.authorization;
                    delete $http.defaults.headers.common['X-SS-BAAS-INSTALL-ID'];

                    //Pull profile
                    $http.get('https://api.twitter.com/user?access_token=' + token)
                        .success(function (data) {
                            var user = {id: data.id, username: data.email, name: data.name, role: role};
                            baasRequest(
                                'post',
                                'auth/facebook/token',
                                {token: token, expiresIn: expiresIn, model: user},
                                function (err, data) {
                                    if (err) {
                                        Alert.error(err);
                                    } else {
                                        switch (data.code) {
                                            case 1: // fb account is linked to a user
                                            case 2: // new fb account, registered and loged user in
                                            case 3: // new fb account, username already used by logged in user
                                                Auth.setAuthToken('#access_token=' + token + '&token_type=bearer');
                                                break;
                                            case 4: // new fb account, username conflict
                                                Alert.warning('"' + user.username + '" is already in use. Please login to' +
                                                    ' that account, goto My Account section and link a provider to your account');
                                                break;
                                        }
                                    }
                                }
                            );
                        });
                }

                return {
                    isBusy: busy,
                    getFbAppId: getId,
                    setAuthToken: setAuthToken
                };
            }
        ]
    );

    baasAuth.run(['$rootScope', '$location', 'simsaw-baas-auth', 'Alert', function ($rootScope, $location, Auth, Alert) {
        if (Auth) {
            // to allow the role based view access.
            $rootScope.$on("$routeChangeStart", function (event, next, current) {
                var accessLevel = next.access || 1;
                if (accessLevel > 1) {
                    Auth.authorize(accessLevel).then(function (allowed) {
                        if (!allowed) {
                            Alert.warning('You have no access to this route.');
                            $location.path('/');

                        }
                    });
                }
            });
        }
    }]);

    // ref: https://github.com/twilson63/ngUpload
    baasAuth.directive(
        'simsawBaasLoginSubmit',
        [
            '$rootScope',
            'simsaw-baas-auth',
            function ($rootScope, Auth) {
                return {
                    restrict: 'AC',
                    link: function (scope, element) {
                        // submit the form - requires jQuery
                        var form = angular.element(angular.element(element).parent()).parent()[0];


                        element.bind('click', function ($event) {
                            // prevent default behavior of click

                            if ($event) {
                                $event.preventDefault = true;
                            }

                            if (element.attr('disabled')) {
                                return;
                            }

                            scope.$apply(function () {
                                $rootScope.isLoading++;
                            });

                            // create a new iframe
                            var iframe = angular.element("<iframe id='baasAuthLoginFrame' name='baasAuthLoginFrame' " +
                                "border='0' width='0'" +
                                "height='0' style='width: 0px; height: 0px; border: none; display: none' />");

                            // attach function to load event of the iframe
                            iframe.bind('load', function (event) {
                                var win;
                                if (iframe[0].contentWindow) {
                                    win = iframe[0].contentWindow;
                                } else {
                                    win =  iframe[0].contentDocument.document ? iframe[0].contentDocument.document : iframe[0].contentDocument;
                                }

                                // get content - requires jQuery
                                var content = angular.element(win.document.body).html();
                                if (content && content !== "") {
                                    // login process is done
                                    scope.$apply(function () {
                                        Auth.setAuthToken(content);
                                        $rootScope.isLoading--;
                                    });
                                    // remove iframe, be it in timeout otherwise we may have issue in chrome
                                    setTimeout(function () { iframe.remove(); }, 250);
                                }
                                element.attr('disabled', null);
                            });

                            // add the new iframe to application
                            angular.element(form).parent().append(iframe);

                            // disable the submit control on click
                            element.attr('disabled', 'disabled');
                            form.submit();
                        });
                    }
                };
            }
        ]
    );

    baasAuth.directive(
        'simsawBaasLogin',
        [
            '$location',
            'simsaw-baas-settings',
            function ($location, settings) {
                return {
                    restrict: 'AC',
                    link: function (scope, element, attrs) {

                        // add a return_url value, this must be validated against oauth2 server entery.
                        var host = $location.protocol() + '://' + $location.host() + ($location.port() && $location.port() !== 80  ? ':' + $location.port() : ''),
                            retUrl = angular.element('<input type="hidden" name="redirect_uri" ' +
                                'value="' + host + '/ss_auth_callback.html">');

                        element.append(retUrl);
                        element.attr("target", "baasAuthLoginFrame");
                        element.attr("method", "POST");
                        element.attr("action", settings.baasUrl + '/auth/login');
                    }
                };

            }
        ]
    );
});