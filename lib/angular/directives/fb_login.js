//https://developers.facebook.com/docs/facebook-login/login-flow-for-web-no-jssdk/#checklogin
define(['app', 'config', 'simsaw/utils', 'simsaw/baas_auth'], function (app, config, Utils, baasAuth) {
    'use restrict';

    // Module
    baasAuth.factory(
        'simsaw-baas-auth-fb',
        [
            '$http',
            'simsaw-baas-auth',
            'simsaw-baas-settings',
            'simsaw-baas-request',
            'Alert',
            function ($http, Auth, settings, baasRequest, Alert) {

                return {
                    getFbAppId: function (cb) {
                        baasRequest('get', 'auth/facebook/key', null, cb);
                    },
                    setAuthToken: function (token, scope, role, popWindow) {
                        Auth.removeCustomHttpHeader($http);

                        //Pull profile
                        $http.get('https://graph.facebook.com/me?access_token=' + token)
                            .success(function (data) {
                                baasRequest(
                                    'post',
                                    'auth/facebook/login',
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
        'fbLogin',
        ['$window', 'simsaw-baas-auth-fb', 'Alert', function ($window, Auth, Alert) {

            var settings = config.simsawBaas.settings(),
                appId,
                lastErr;

            Auth.getFbAppId(function (err, data) {
                if (err) {
                    lastErr = err;
                    Alert.error(err);
                } else if (data.key) {
                    appId = data.key;
                    lastErr = null;
                } else {
                    lastErr = 'Facebook AppId not found';
                    Alert.error(lastErr);
                }
            });

            return {
                restrict: 'A',
                template: '<span class="btn btn-fb"">Login with facebook</span>',
                link: function (scope, element, attrs) {

                    var noStyle = attrs.noStyle,
                        noText = attrs.noText;

                    var fbButton = element.children('span');

                    if (noStyle) {
                        fbButton.removeClass('btn btn-fb');
                    }

                    if (noText) {
                        fbButton.text('');
                    }

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
                            redirectUri = Utils.host() + '/fb_auth_callback.html',
                            url = 'https://www.facebook.com/dialog/oauth?app_id=' + appId + '&redirect_uri=' + redirectUri +
                                '&response_type=token&scope=email',
                            fbPopUp  = $window.open(
                                url,
                                'fbLogin',
                                    'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, ' +
                                    'width=' + w + ', height=' + h + ', top=' + top + ', left=' + left,
                                true
                            );

                        fbPopUp.document.title = "Facebook Login";
                        fbPopUp.focus();

                        $window.fbOauthResponse = function (hash) {
                            var params  = Utils.getHashParams(hash);
                            if (params.access_token) {
                                Auth.setAuthToken(params.access_token, "email", role, fbPopUp);
                            } else if (params.error) {
                                Alert.err(params.error_description);
                                fbPopUp.close();
                            }
                        };
                    });
                }
            };
        }]
    );
});