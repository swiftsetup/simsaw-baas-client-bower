//https://developers.google.com/accounts/docs/OAuth2InstalledApp
define(['app', 'config', 'simsaw/utils', 'simsaw/baas_auth'], function (app, config, Utils, baasAuth) {
    'use restrict';

    // Module
    baasAuth.factory(
        'simsaw-baas-auth-google',
        [
            '$http',
            'simsaw-baas-auth',
            'simsaw-baas-settings',
            'simsaw-baas-request',
            'Alert',
            function ($http, Auth, settings, baasRequest, Alert) {
                return {
                    getClientId: function (cb) {
                        baasRequest('get', 'auth/google/key', null, cb);
                    },
                    setAuthToken: function (token, scope, role, popWindow) {
                        Auth.removeCustomHttpHeader($http);

                        //Pull profile
                        $http.get('https://www.googleapis.com/plus/v1/people/me?access_token=' + token)
                            .success(function (data) {
                                baasRequest(
                                    'post',
                                    'auth/google/login',
                                    {model: data, token: token, role: role, scope: scope},
                                    function (err, data) {
                                        if (err) {
                                            Alert.error(err);
                                        } else {
                                            Auth.socialLogin(data);
                                        }
                                        popWindow && popWindow.close();
                                    }
                                );
                            });
                    }
                };
            }
        ]
    );

    // Directive
    app.directive(
        'googleLogin',
        ['$window', 'simsaw-baas-auth-google', 'Alert', function ($window, Auth, Alert) {

            var clientID,
                lastErr;

            Auth.getClientId(function (err, data) {
                if (err) {
                    lastErr = err;
                    Alert.error(err);
                } else if (data.key) {
                    clientID = data.key;
                    lastErr = null;
                } else {
                    lastErr = 'Google ClientID not found';
                    Alert.error(lastErr);
                }
            });

            return {
                restrict: 'A',
                link: function (scope, element, attrs) {

                    element.bind('click', function () {

                        if (lastErr) {
                            Alert.error(lastErr);
                            return;
                        }

                        var role = 4,
                            w = 600,
                            h = 400,
                            left = (screen.width/2) - (w/2),
                            top = (screen.height/2) - (h/2),

                            redirectUri = Utils.host() + '/google_auth_callback.html',

                            url = 'https://accounts.google.com/o/oauth2/auth?' +
                                'client_id=' + clientID +
                                '&redirect_uri=' + redirectUri +
                                '&response_type=token' +
                                '&scope=email%20profile',

                            gPopUp  = $window.open(
                                url,
                                'gLogin',
                                    'toolbar=no, location=yes, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, ' +
                                    'width=' + w + ', height=' + h + ', top=' + top + ', left=' + left,
                                true
                            );

                        gPopUp.document.title = "Google Login";
                        gPopUp.focus();

                        $window.googleOauthResponse = function (hash) {
                            var params  = Utils.getHashParams(hash);
                            if (params.access_token) {
                                Auth.setAuthToken(params.access_token, 'email profile', role, gPopUp);
                            } else if (params.error) {
                                Alert.err(params.error_description);
                                gPopUp.close();
                            }
                        };
                    });
                }
            };
        }]
    );
});