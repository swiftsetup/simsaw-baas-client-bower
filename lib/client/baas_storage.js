// ref :http://codeartists.com/post/36892733572/how-to-directly-upload-files-to-amazon-s3-from-your
/**
 * Sample Use:
 *  <div data-file-upload data-multiple="true" data-acl='private' data-on-complete="uploadCompleted(files)">
 *  </div>
 *
 * CSS
 .file-upload-drop-zone {
        height: 100px;
        width: 200px;
        border: 3px dotted #ffffff;
    }
 .file-upload-dragover {
    }
 .file-upload-list {
    }
 .file-upload-input {
    }
 .file-upload-limit {
    }
 */
define(['angular', 'simsaw/utils'], function (angular, utils) {
    'use strict';

    var baasStorage = angular.module('simsaw-baas-storage', ['simsaw-baas', 'simsaw-baas-auth']);

    baasStorage.directive(
        'fileUpload',
        [
            '$rootScope',
            'simsaw-baas-request',
            'Alert',
            function ($rootScope, baasRequest, Alert) {
                return {
                    restrict: 'EA',
                    scope: {onComplete: '&'},
                    template: '<span class="btn btn-default fileinput-button"> ' +
                        '<i class="glyphicon glyphicon-plus"></i>' +
                        ' <span>Upload</span>' +
                        '<input type="file" name="files[]" multiple></span><br>' +
                        '<small class="file-upload-limit"> File max size must be {{ limit }}</small>' +
                        '<p data-ng-repeat="upload in uploads | filter: {uploading: true}">' +
                        '<progress id="uploadprogress" min="0" max="100" value="{{upload.progress}}">0</progress>' +
                        '&nbsp;<small>{{ upload.fileName }}</small>' +
                        '</p>',
                    link: function (scope, elem, attrs) {
                        scope.acl = attrs.acl;
                        scope.uploads = [];
                        scope.pendingUploads = 0;
                        var isTypeValid, validMimeTypes;

                        baasRequest('GET', 'storage/' + scope.acl + '-upload', function (err, data) {
                            if (err) {
                                Alert.error(err);
                            } else {
                                scope.limit = data.maxFileSize;
                                validMimeTypes = attrs.fileUpload;

                                if (test().progress && test().formData) {

                                    var  fileInput = elem.find('input');

                                    if (attrs.multiple && attrs.multiple === 'true') {
                                        fileInput.attr('multiple', 'multiple');
                                    }

                                    fileInput.bind('change', function () {
                                        var self = this;
                                        scope.$apply();
                                        if (isTypeValid(self.files[0].type)) {
                                            readFiles(scope, data, self.files, $rootScope.user);
                                        } else {
                                            fileInput.val("");
                                        }
                                    });

                                } else {

                                    //*** ng upload ***
                                    alert('xhr2 upload is not supported, ngUpload will work, pending to implement...');
                                }

                                isTypeValid = function (type) {
                                    if (((validMimeTypes === (void 0) || validMimeTypes === '' ) || validMimeTypes.indexOf(type) > -1) && type !== '') {
                                        return true;
                                    } else {
                                        alert("Invalid file type.");
                                        return false;
                                    }

                                };
                            }
                        });
                    }
                };
            }
        ]
    );

    // ref: http://html5demos.com/dnd-upload
    /**
     * .file-upload-drop {height:100px;width:200px;border: 1px dotted black}
     */
    baasStorage.directive(
        'fileUploadDragDrop',
        [
            '$rootScope',
            'simsaw-baas-request',
            'Alert',
            function ($rootScope, baasRequest, Alert) {
                return {
                    restrict: 'EA',
                    scope: {onComplete: '&'},
                    template: '<div class="file-upload-drop-zone"></div><br>' +
                        '<input class="file-upload-input" multiple="multiple" type="file"></label>' +
                        '<small class="file-upload-limit"> File max size must be {{ limit }}</small>' +
                        '<p data-ng-repeat="upload in uploads | filter: {uploading: true}">' +
                        '<progress min="0" max="100" value="{{upload.progress}}">0</progress>' +
                        '&nbsp;<small>{{ upload.fileName }}</small>' +
                        '</p>',
                    link: function (scope, elem, attrs) {
                        scope.acl = attrs.acl;
                        scope.pendingUploads = 0;
                        scope.uploads = [];
                        var isTypeValid, validMimeTypes;

                        baasRequest('GET', 'storage/' + scope.acl + '-upload', function (err, data) {
                            if (err) {
                                Alert.error(err);
                            } else {
                                scope.limit = data.maxFileSize;

                                var holder = elem.find('div'),
                                    fileInput = elem.find('input');

                                validMimeTypes = attrs.fileUploadDragDrop;
                                if (test().draggable) {
                                    holder[0].ondragover = function (event) {
                                        holder.addClass('file-upload-dragover');
                                        return false;
                                    };

                                    holder[0].ondrop = function (event) {
                                        var type, file;
                                        file = event.dataTransfer.files[0];
                                        type = file.type;
                                        holder.removeClass('file-upload-dragover');
                                        event.preventDefault();
                                        if (isTypeValid(type)) {
                                            readFiles(scope, data, event.dataTransfer.files, $rootScope.user);
                                        }

                                    };
                                } else {
                                    holder.className = 'hidden';
                                }

                                fileInput.bind('change', function () {
                                    var self = this;
                                    scope.$apply();
                                    if (isTypeValid(self.files[0].type)) {
                                        readFiles(scope, data, self.files, $rootScope.user);
                                    } else {
                                        fileInput.val("");
                                    }
                                });

                                isTypeValid = function (type) {
                                    if (((validMimeTypes === (void 0) || validMimeTypes === '' ) || validMimeTypes.indexOf(type) > -1) && type !== '') {
                                        return true;
                                    } else {
                                        alert("Invalid file type.");
                                        return false;
                                    }
                                };
                            }
                        });
                    }
                };
            }
        ]
    );

    /**
     * Sample syntax:
     * model can be object or array of objects, object must have properties "key" and "fileName"
     <div data-file-download data-fileInfo="model">
     <i class="glyphicon glyphicon-download"></i>
     {{fileName}}
     </div>
     */
    baasStorage.directive(
        'fileDownload',
        [
            '$rootScope',
            '$window',
            'simsaw-baas-request',
            'simsaw-baas-settings',
            function ($rootScope, $window, baasRequest, baasSettings) {
                return {
                    restrict: 'A',
                    scope: {fileInfo: '='},
                    link: function (scope, elem, attrs) {

                        scope.$watch('fileInfo', function () {
                            if (scope.fileInfo) {
                                init();
                            }
                        });

                        var url = baasSettings.baasUrl + '/storage/download-url?key={key}&fileName={fileName}',
                            isArray = false,
                            list = [];

                        function init() {

                            if (Object.prototype.toString.call(scope.fileInfo) === '[object Array]') {
                                isArray = true;
                            }

                            function appendAnchor(obj) {
                                var href = url.replace('{key}', obj.key).replace('{fileName}', obj.fileName);
                                var anchor = angular.element('<a href="' + href + '" target="_blank" class="silent-download hidden">' + obj.fileName + '</a>')
                                elem.append(anchor);
                                anchor.bind('click', function (e) {
                                    if (e) {
                                        if (e.stopPropagation) {
                                            e.stopPropagation();
                                        } else {
                                            e.cancelBubble = true;
                                        }
                                    }
                                });
                            }

                            if (isArray) {
                                for(var i in scope.fileInfo) {
                                    appendAnchor(scope.fileInfo[i]);
                                }
                            } else {
                                appendAnchor(scope.fileInfo);
                            }

                            angular.element(elem[0]).bind('click', function (e) {
                                elem.children('a').each(function (index) {
                                    var anchor = angular.element(this);
                                    if (anchor.hasClass('silent-download')) {
                                        this.click();
                                    }
                                });

                            });
                        }
                    }
                };
            }
        ]
    );

    function test() {
        return {
            fileReader: typeof FileReader != 'undefined',
            draggable: 'draggable' in document.createElement('span'),
            formData: !!window.FormData,
            progress: "upload" in new XMLHttpRequest
        };
    }

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

    function readMessage(responseText) {
        if (responseText) {
            var res = responseText.match(/<Message>([^<]+)<\/Message>/);
            return res.length > 0 ? res[0].replace('<Message>', '').replace('</Message>', '') : '';
        }
        return '';
    }

    function getNewFileName(fileName) {
        var arr = fileName.split('.'),
            last = arr.length - 1,
            randString = +(new Date()) + utils.randomString();

        return randString + '.' + arr[last];
    }

    function readFiles(scope, data, files, user) {
        var i = 0;
        for (i; i < files.length; i++) {
            uploadFile(scope, data, files[i], user);
        }
    }

    function uploadFile(scope, data, file, user) {
        var key = '',
            filePath,
            newFileName = getNewFileName(file.name),
            stat;

        if (scope.acl === 'public-read') {
            key = 'public/';
        }

        if (user) {
            key += user.id + '/';
        }

        key += getNewFileName(file.name);

        // build formData
        var formData = new FormData();
        formData.append('key', key);//${filename}
        formData.append('AWSAccessKeyId', data.awsKey);
        formData.append('acl', scope.acl);
        formData.append('policy', data.policy);
        formData.append('signature', data.signature);
        formData.append('Content-Type', file.type);
        formData.append('file', file);

        stat = {
            fileName: file.name,
            progress: 0,
            key: key,
            host: data.host,
            url: data.host + key,
            uploading: true
        };

        scope.uploads.push(stat);
        scope.pendingUploads++;

        scope.$apply();

        var xhr = xhrRequest('POST', data.host);

        xhr.onload = function (e) {
            if (xhr.status === 200 || xhr.status === 204) {
                stat.progress = 100;
                stat.uploading = false;
                scope.pendingUploads--;
                scope.$apply();

                if (scope.pendingUploads <= 0) {
                    scope.onComplete({files: scope.uploads});
                    scope.uploads = [];
                }
            } else {
                stat.fileName += ' Error: ' + readMessage(this.responseText);
                scope.$apply();
            }
        };

        xhr.onerror = function (e) {
            stat.progress = 0;
            stat.fileName += ' Error: ' + readMessage(this.responseText);
            scope.$apply();
        };

        xhr.upload.onprogress = function (e) {
            if (e.lengthComputable) {
                stat.progress = Math.round((e.loaded / e.total) * 100);
                scope.$apply();
            }
        };

        xhr.send(formData);
    }
});
