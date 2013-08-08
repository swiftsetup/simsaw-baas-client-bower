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

                function getUserInfo() {
                    var token = $cookieStore.get('auth'),
                        deferred = $q.defer();
                    if (token && !$rootScope.user.role) {
                        baasRequest('get', 'auth/info', null, function (err, data) {
                            if (err) {
                                $rootScope.user.username = '';
                                $rootScope.user.role = null;
                                $rootScope.user.id = '';
                            } else {
                                $rootScope.user.username = data.username;
                                $rootScope.user.role = data.role;
                                $rootScope.user.id = data._id;
                            }
                            deferred.resolve($rootScope.user);
                        });
                    } else {
                        deferred.resolve($rootScope.user);
                    }
                    return deferred.promise;
                }

                getUserInfo().then(function (user) {
                    //console.log('pulled user info');
                });

                return {
                    user: function () {
                        return $rootScope.user;
                    },
                    register: function (user, cb) {
                        baasRequest('post', 'auth/register', {model: user}, cb);
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
                        var flag = $rootScope.user && $rootScope.user.role;
                        return flag;
                    },
                    logOut: function () {

                        baasRequest('delete', 'auth/logout', null, function (err, data) {
                            if (err) {
                                Alert.error('Error on logging you out.');
                            } else {
                                $cookieStore.remove('auth');

                                if ($rootScope.user) {
                                    $rootScope.user.username = '';
                                    $rootScope.user.role = null;
                                }
                                $location.path('/');
                            }
                        });
                    },
                    getUserInfo: getUserInfo
                };
            }
        ]
    );

    baasAuth.run(['$rootScope', '$location', 'simsaw-baas-auth', function ($rootScope, $location, Auth) {
        if (Auth) {
            // to allow the role based view access.
            $rootScope.$on("$routeChangeStart", function (event, next, current) {
                Auth.authorize(next.access).then(function (allowed) {
                    if (!allowed) {
                        if (Auth.isLoggedIn()) {
                            $location.path('/');
                        } else {
                            $location.path('sign-in');
                        }
                    }
                });
            });
        }
    }]);

    // ref: https://github.com/twilson63/ngUpload
    baasAuth.directive(
        'simsawBaasLoginSubmit',
        [
            'simsaw-baas-auth',
            function (auth) {
                return {
                    restrict: 'AC',
                    link: function (scope, element, attrs) {

                        // submit the form - requires jQuery
                        var form = angular.element(element).parents('form');

                        element.bind('click', function ($event) {
                            // prevent default behavior of click

                            if ($event) {
                                $event.preventDefault = true;
                            }

                            if (element.attr('disabled')) {
                                return;
                            }

                            // create a new iframe
                            var iframe = angular.element("<iframe id='baasAuthLoginFrame' name='baasAuthLoginFrame' " +
                                "border='0' width='0'" +
                                "height='0' style='width: 0px; height: 0px; border: none; display: none' />");

                            // attach function to load event of the iframe
                            iframe.bind('load', function () {

                                // get content - requires jQuery
                                var content = iframe.contents().find('body').html();

                                if (content !== "") {
                                    // login process is done
                                    scope.$apply(function () {
                                        auth.setAuthToken(content);
                                    });
                                    // remove iframe, be it in timeout otherwise we may have issue in chrome
                                    setTimeout(function () { iframe.remove(); }, 250);
                                }
                                element.attr('disabled', null);
                            });

                            // add the new iframe to application
                            form.parent().append(iframe);

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