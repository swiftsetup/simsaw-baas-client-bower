//REF: https://dev.twitter.com/docs/auth/implementing-sign-twitter
define(['app', 'config', 'simsaw/utils'], function (app, config, Utils) {
    'use restrict';
    app.directive(
        'twitterLogin',
        ['$window', 'simsaw-baas-auth-twitter', 'Alert', function ($window, Auth, Alert) {

            var lastErr,
                reqToken;

            Auth.getRequestToken(function (err, data) {
                if (err || !data) {
                    lastErr = err;
                } else {
                    reqToken = data; //{token: oauth_token, secret: oauth_token_secret}
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
                            url = 'https://api.twitter.com/oauth/authenticate?oauth_token=' + reqToken.token,
                            authPopUp  = $window.open(url, 'Twitter Login', 'toolbar=no, location=yes, directories=no, ' +
                                'status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, ' +
                                'width=' + w + ', height=' + h + ', top=' + top + ', left=' + left);

                        authPopUp.document.title = "Twitter Login";
                        authPopUp.focus();

                        $window.twitterOauthResponse = function (queryString) {
                            var params  = Utils.getHashParams(queryString);
                            if (params.oauth_token) {
                                Auth.setAuthToken(reqToken.secret, params.oauth_token, params.oauth_verifier, role);
                            } else if (params.error) {
                                Alert.err(params.error_description);
                            }
                            authPopUp.close();
                        };
                    });
                }
            };
        }]
    );
});