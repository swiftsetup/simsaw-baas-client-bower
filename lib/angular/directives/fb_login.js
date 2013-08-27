//https://developers.facebook.com/docs/facebook-login/login-flow-for-web-no-jssdk/#checklogin
define(['app', 'config', 'simsaw/utils'], function (app, config, Utils) {
    'use restrict';
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
                template: '<span class="btn btn-fb" data-ng-click="login()"></span>',
                scope: {},
                link: function (scope, element, attrs) {

                    scope.login = function () {

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
                            fbPopUp  = $window.open(url, 'Facebook Login', 'toolbar=no, location=no, directories=no, ' +
                                'status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, ' +
                                'width=' + w + ', height=' + h + ', top=' + top + ', left=' + left);

                        fbPopUp.document.title = "Facebook Login";
                        fbPopUp.focus();

                        $window.fbOauthResponse = function (hash) {
                            var params  = Utils.getHashParams(hash);
                            if (params.access_token) {
                                Auth.setAuthToken(params.access_token, params.expires_in, role);
                            } else if (params.error) {
                                Alert.err(params.error_description);
                            }
                            fbPopUp.close();
                        };
                    };
                }
            };
        }]
    );
});