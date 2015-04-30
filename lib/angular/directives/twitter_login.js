//REF: https://dev.twitter.com/docs/auth/implementing-sign-twitter
define(['app', 'config', 'simsaw/utils', 'simsaw/baas_auth'], function (app, config, Utils, baasAuth) {
    'use restrict';
    // Module
    baasAuth.factory(
        'simsaw-baas-auth-twitter',
        [
            '$http',
            'simsaw-baas-auth',
            'simsaw-baas-settings',
            'simsaw-baas-request',
            'Alert',
            function ($http, Auth, settings, baasRequest, Alert) {

                return {
                    getRequestToken: function (cb) {
                        baasRequest('GET', 'auth/twitter/request-token', cb);
                    },
                    setAuthToken: function (token, secret, verifier, role, popWindow) {
                        baasRequest(
                            'post',
                            'auth/twitter/login',
                            {token: token, secret: secret, verifier: verifier, role: role, scope: ''},
                            function (err, data) {
                                if (err) {
                                    Alert.error(err);
                                } else {
                                    Auth.socialLogin(data);
                                }
                                popWindow && popWindow.close();
                            }
                        );
                    }
                };
            }
        ]
    );

    // Directive
    app.directive(
        'twitterLogin',
        ['$window', 'simsaw-baas-auth-twitter', 'Alert', function ($window, Auth, Alert) {

            return {
                restrict: 'A',
                link: function (scope, element, attrs) {
                    element.bind('click', function () {
                        Auth.getRequestToken(function (err, data) {
                            if (err || !data) {
                                Alert.error(err);
                            } else {
                                var reqToken = data, //{token: oauth_token, secret: oauth_token_secret}
                                    role = 4,
                                    w = 600,
                                    h = 400,
                                    left = (screen.width/2) - (w/2),
                                    top = (screen.height/2) - (h/2),
                                    url = 'https://api.twitter.com/oauth/authenticate?oauth_token=' + reqToken.token,
                                    authPopUp  = $window.open(
                                        url,
                                        'twLogin',
                                            'toolbar=no, location=yes, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, ' +
                                            'width=' + w + ', height=' + h + ', top=' + top + ', left=' + left,
                                        true
                                    );

                                authPopUp.document.title = "Twitter Login";
                                authPopUp.focus();

                                $window.twitterOauthResponse = function (queryString) {
                                    var params  = Utils.getHashParams(queryString);
                                    if (params.oauth_token) {
                                        Auth.setAuthToken(reqToken.token, reqToken.secret, params.oauth_verifier, role, authPopUp);
                                    } else {
                                        Alert.error(params.error || params.error_description  || params.denied);
                                        authPopUp.close();
                                    }
                                };
                            }
                        });


                    });
                }
            };
        }]
    );
});