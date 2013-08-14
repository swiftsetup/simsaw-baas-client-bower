// ref :http://codeartists.com/post/36892733572/how-to-directly-upload-files-to-amazon-s3-from-your
define(['angular'], function (angular) {
    'use strict';

    var baasStorage = angular.module('simsaw-baas-storage', ['simsaw-baas', 'simsaw-baas-auth']);

    function xhrRequest(method, url) {
        var xhr;
        xhr = new XMLHttpRequest();
        if (xhr.withCredentials != null) {
            xhr.open(method, url, true);
        } else if (typeof XDomainRequest !== "undefined") {
            xhr = new XDomainRequest();
            xhr.open(method, url);
        } else {
            xhr = null;
        }
        return xhr;
    }

    baasStorage.directive(
        'uploadFile',
        [
            '$rootScope',
            'simsaw-baas-request',
            'Alert',
            function ($rootScope, baasRequest, Alert) {
                return {
                    restrict: 'EA',
                    scope: {uploadcomplete: '&'},
                    template: '<div>' +
                        '<input type="file"/><br>' +
                        '<small> File max size must be {{ limit }}</small>' +
                        '<div data-ng-repeat="upload in uploads"><strong>{{ upload.fileName }}</strong> - {{ upload.progress }}</div>' +
                        '</div>',
                    link: function (scope, elem, attrs) {
                        var acl = attrs.acl;
                        scope.uploads = [];
                        scope.pendingUploads = 0;

                        baasRequest('GET', 'storage/' + acl + '-upload', function (err, data) {
                            if (err) {
                                Alert.error(err);
                            } else {
                                scope.limit = data.maxFileSize;

                                if (window.ProgressEvent && window.FormData) {

                                    var  file = elem.find('input[type=file]');

                                    if (attrs.multiple && attrs.multiple === 'true') {
                                        file.attr('multiple', 'multiple');
                                    }

                                    file.bind('change', function () {
                                        scope.uploads = [];
                                        scope.$apply();
                                        var files = file[0].files,
                                            i;
                                        for (i = 0; i < files.length; i++) {
                                            xhrS3Upload(data, files[i], $rootScope.user, i);
                                        }
                                    });
                                } else {

                                    //*** ng upload ***
                                    alert('xhr2 upload is not supported, ngUpload will work, pending to implement...');
                                }
                            }
                        });

                        function onComplete(index, response) {
                            var stat = scope.uploads[index];
                            stat.progress = 'Done';
                            scope.pendingUploads--;
                            scope.$apply();

                            if (scope.pendingUploads <= 0) {
                                scope.uploadcomplete(scope.uploads);
                            }
                        }

                        function onProgress(index, progress) {
                            var stat = scope.uploads[index];
                            stat.progress = progress + '%';
                            scope.$apply();
                        }

                        function onError(index, response) {
                            var stat = scope.uploads[index];
                            stat.progress = 'Error: ' + readMessage(response);
                            scope.$apply();
                        }

                        function readMessage(responseText) {
                            var res = responseText.match(/<Message>([^<]+)<\/Message>/);
                            return res.length > 0 ? res[0].replace('<Message>', '').replace('</Message>', '') : '';
                        }


                        function xhrS3Upload(data, file, user, index) {
                            var formData = new FormData(),
                                key = '';
                            if (acl === 'public-read') {
                                key = 'public/';
                            }

                            if (user) {
                                key += user.id + '/${filename}';
                            } else {
                                key += '${filename}';
                            }
                            formData.append('key', key);

                            formData.append('AWSAccessKeyId', data.awsKey);
                            formData.append('acl', acl);
                            formData.append('policy', data.policy);
                            formData.append('signature', data.signature);
                            formData.append('Content-Type', file.type);
                            formData.append('file', file);

                            scope.uploads.push(
                                {
                                    fileName: file.name,
                                    progress: 'Starting upload...',
                                    key: key.replace('${filename}', file.name),
                                    host: data.host
                                });
                            scope.$apply();

                            var  xhr = xhrRequest('POST', data.host);

                            xhr.onload = function () {
                                if (xhr.status === 200 || xhr.status === 204) {
                                    onComplete(index, this.responseText);
                                } else {
                                    onError(index, this.responseText);
                                }
                            };

                            xhr.onerror = function () {
                                onError(index, this.responseText);
                            };

                            xhr.upload.onprogress = function (e) {
                                var percentLoaded;
                                if (e.lengthComputable) {
                                    percentLoaded = Math.round((e.loaded / e.total) * 100);
                                    onProgress(index, percentLoaded);
                                }
                            };

                            scope.pendingUploads++;

                            xhr.send(formData);
                        }
                    }
                };
            }
        ]
    );
});
