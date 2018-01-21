// SLug the text
var flagArr = [];
var slugify = function (text) {
    //console.log(text+" : slugified");
    return text.toString().toLowerCase().replace(/\s+/g, '-')// Replace spaces with -
        .replace(/[^\w\-]+/g, '')// Remove all non-word chars
        .replace(/\-\-+/g, '-')// Replace multiple - with single -
        .replace(/^-+/, '')// Trim - from start of text
        .replace(/-+$/, '');
    // Trim - from end of text
};

var albumArtEnhancer = function(coverURL){

    var tempURL = coverURL.toString();
    tempURL = tempURL.replace("150x150","500x500");
    tempURL = tempURL.replace("50x50","500x500");
    tempURL = tempURL.replace("80x80","500x500");
    tempURL = tempURL.replace("250x250","500x500");
    tempURL = tempURL.replace("350x350","500x500");
    console.log("Album Artwork Enhanced");
    return tempURL;
};

var bytesToSize = function (a, b) {
    if (0 === a)return "0 Bytes";
    var c = 1024, d = b || 2, e = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
        f = Math.floor(Math.log(a) / Math.log(c));
    //console.log("bytesToSize Finished");
    return parseFloat((a / Math.pow(c, f)).toFixed(d)) + " " + e[f]
};

if(!localStorage.download_bitrate) {
    localStorage.download_bitrate = '320';
}

var bitrateString = " [" + localStorage.download_bitrate + " kbps]";
//console.log("Bitrate Set to : "+bitrateString);

var getDownloadURL = function (song, bit, callback) {
    console.log("getDownloadURL begins for "+song.title);
    if (!bit) {
        bit = localStorage.download_bitrate;
    }

    var postData = {
        url: song.url,
        __call: "song.generateAuthToken",
        _marker: "false",
        _format: "json",
        bitrate: bit
    };

    $.ajax({
        type: "POST",
        url: "https://www.saavn.com/api.php",
        crossDomain: true,
        dataType: "json",
        data: postData,
        xhrFields: {
            withCredentials: true
        },
        success: function (result, status) {
            callback(result, 'success');
        },
        error: function (result, status) {
            console.log(result);
            callback(result, 'error');
        }
    })
};

var getURLArrayBuffer = function (url, onload, statusObject) {
    //
    // console.log("getURLArrayBuffer() initiated");
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';

    if (statusObject) {
        singleShowSingleSongProgress(xhr, statusObject);
    }

    xhr.onload = function () {
        if (xhr.status === 200) {

            if(statusObject) {
                statusObject.flush();
            }

            onload(xhr.response);
        } else {
            console.error(xhr.statusText + ' (' + xhr.status + ')');
        }
    };

    xhr.onerror = function () {
        console.error('Network error');
    };

    xhr.send();
};

var downloadWithData = function (song, songFileUrl, callback) {
    // console.log("downloadWithData begins");
    //console.log(song.title+" in downloadWithData");
    getSongBlob(song, songFileUrl, function (blob) {
        saveAs(blob, song.title + '.mp3');
        callback();
    }, true);
    //console.log(song.title+" exiting in downloadWithData");
};

var getSongBlob = function (song, index, songFileUrl, hideInEnd, hideStatus) {
    //console.log(song.title+" in getSongBlob");
    var songStatus = downloadStatus.createRow();

    if(hideStatus) {
        songStatus.hide();
    }
    console.log("Downloading Artwork For : "+song.title);
    song.image_url = albumArtEnhancer(song.image_url);
    getURLArrayBuffer(song.image_url, function (coverArrayBuffer) {

        //console.log("Downloading Song : "+song.title);

        getURLArrayBuffer(songFileUrl, function (arrayBuffer) {

            const writer = new ID3Writer(arrayBuffer);
            writer.setFrame('TIT2', song.title)
                .setFrame('TPE1', song.singers.split(', '))
                .setFrame('TCOM', [song.music])
                .setFrame('TALB', song.album)
                .setFrame('TYER', song.year)
                .setFrame('TPUB', song.label)
                .setFrame('TCON', ['Soundtrack'])
                .setFrame('TBPM', 128)
                .setFrame('APIC', {
                    type: 3,
                    data: coverArrayBuffer,
                    description: song.title
                });

            writer.addTag();

            const blob = writer.getBlob();

            console.log("Downloaded Song : "+song.title+" => Setting its Flag = 0");
            flagArr[index] = 0;
            return blob;

        }, songStatus)

    });
};

function allDone(flagArr){
    var x =0;
    var locFlag = 0;
    while(x<flagArr.length){
        if(flagArr[x]===1){
            locFlag = 1;
        }
        x++;
    }
    if (locFlag === 1){
        return 1;
    }
    return 0;
};




var downloadSetOfSongsAsZip = function (songList, nameOfZip) {
    console.log("Downloading Album : "+nameOfZip);

    var zip = new JSZip();

    // create a folder in the name of album
    var album = zip.folder(nameOfZip);
    var zipStat = downloadStatus.createRow();
    var albumStatus = 'Album : ' + nameOfZip + " : Download in Progress";
    console.log(albumStatus);
    songList.forEach(
        function (song, index) {
            // get the download url of song
            flagArr.push(1);
            console.log(flagArr);
            console.log("getDownloadURL begins for "+song.title);
            var retval = [];
            bit = false;
            if (!bit) {
                bit = localStorage.download_bitrate;
            }

            var postData = {
                url: song.url,
                __call: "song.generateAuthToken",
                _marker: "false",
                _format: "json",
                bitrate: bit
            };

            $.ajax({
                type: "POST",
                url: "https://www.saavn.com/api.php",
                crossDomain: true,
                dataType: "json",
                data: postData,
                xhrFields: {
                    withCredentials: true
                },
                success: function (result, status) {
                    retval = [result, 'success'];
                },
                error: function (result, status) {
                    retval = [result, 'error'];
                }
            });
            console.log(retval+" Received for "+song.title);
            var result = retval[0];
            var errorStat = retval[1];

            if(errorStat === "success"){
                console.log("URL receive successfully for : "+song.title);
                var songBlob = getSongBlob(song, index, result.auth_url, true, false);

                //SongBlob
                var songStatus = downloadStatus.createRow();
                var hideStatus = false;
                if(hideStatus) {
                    songStatus.hide();
                }
                //Getting Album Artwork
                console.log("Downloading Artwork For : "+song.title);
                song.image_url = albumArtEnhancer(song.image_url);

                const xhr = new XMLHttpRequest();
                xhr.open('GET',song.image_url,false)
                xhr.responseType = 'arraybuffer';
                if(songStatus){
                    singleShowSingleSongProgress(xhr, songStatus);
                }

                xhr.onload = function(){
                    if(xhr.status === 200){
                        if(songStatus){
                            songStatus.flush();
                        }
                    }else{
                        console.error(xhr.statusText+' ('+xhr.status+')');
                    }
                };

                xhr.onerror = function () {
                    console.error("Network Error");
                };
                xhr.send();
                console.log("Artwork Downloaded For : "+song.title);
                var coverArrayBuffer = xhr.response; // Assuming No Error always

                //Downloading Track
                songStatus.status("Downloading Song : "+song.title);
                const xhr = new XMLHttpRequest();
                xhr.open('GET',song.image_url,false)
                xhr.responseType = 'arraybuffer';
                if(songStatus){
                    singleShowSingleSongProgress(xhr, songStatus);
                }

                xhr.onload = function(){
                    if(xhr.status === 200){
                        if(songStatus){
                            songStatus.flush();
                        }
                    }else{
                        console.error(xhr.statusText+' ('+xhr.status+')');
                    }
                };

                xhr.onerror = function () {
                    console.error("Network Error");
                };
                xhr.send();
                console.log("Track Buffer Downloaded For : "+song.title);
                var trackArrayBuffer = xhr.response;

                //Consolidating Everything
                const writer = new ID3Writer(arrayBuffer);
                writer.setFrame('TIT2', song.title)
                    .setFrame('TPE1', song.singers.split(', '))
                    .setFrame('TCOM', [song.music])
                    .setFrame('TALB', song.album)
                    .setFrame('TYER', song.year)
                    .setFrame('TPUB', song.label)
                    .setFrame('TCON', ['Soundtrack'])
                    .setFrame('TBPM', 128)
                    .setFrame('APIC', {
                        type: 3,
                        data: coverArrayBuffer,
                        description: song.title
                    });

                writer.addTag();

                const blob = writer.getBlob();
                console.log("Post Processing Finished For : "+song.title);


                //Saving in the Zip to be written

                console.log("Received Blob For : "+song.title);
                album.file(song.title + '.mp3', blob);
                console.log(("Finalized Blob For : "+song.title));
                if (index+1 === songs.length) {
                    console.log("Compressing & Zipping the Downloads");
                    downloadZip(zip, nameOfZip, function () {
                        zipStat.status("Download Complete", true);
                        zipStat.flushAll();
                    });
                }
            };

        }
    );
};


var downloadStatus = function () {
    var downStatus, downStatusWrapper;

    return {

        create: function () {
            $('.download-status-wrapper').remove();
            downStatusWrapper = $('<div class="download-status-wrapper"></div>');
            $('#player').prepend(downStatusWrapper);
        },
        createRow : function () {
            downStatus = $('<div class="download-status"> <span class="progress"></span><p class="status-text"></p><p class="status-right"></p></div>');
            downStatus.hide();
            downStatusWrapper.append(downStatus);

            return this;
        },
        el: function () {
            return downStatus;
        },
        hide: function () {
            downStatus.hide();
        },
        show: function () {
            downStatus.show();
        },
        progress: function (value) {
            downStatus.find('.progress').first().width(value + "%")
        },
        clear: function () {
            downStatus.find('p.status-text').first().html("");
            downStatus.find('p.status-right').first().html("");
        },
        reset: function () {
            this.clear();
            this.hide();
            this.progress(0);
        },
        flush : function () {
            downStatus.remove();
        },
        flushAll : function () {
            $('.download-status').remove();
        },
        status: function (message, hide) {
            this.show();

            if (hide) {
                this.reset();
                this.flush();
            }
            else {
                downStatus.find('p.status-text').first().html(message + "<span>.</span><span>.</span><span>.</span>")
            }
        },
        statusRight: function (message, hide) {
            var self = this;

            if (hide) {
                this.progress(100);
                setTimeout(function () {
                    self.reset();
                }, 1500);
            }

            downStatus.find('p.status-right').first().html(message)
        }
    }

}();


var downloadZip = function (zip, name, callback) {
    zip.generateAsync({type: "blob"})
        .then(function (blob) {
            saveAs(blob, name);
            callback();
        });
};

var singleShowSingleSongProgress = function (xhr, statusObject) {
    xhr.addEventListener("progress", updateProgress);
    xhr.addEventListener("load", transferComplete);

    function updateProgress(e) {

        var percentComplete = e.loaded / e.total;

        if(statusObject) {
            statusObject.statusRight(bytesToSize(e.loaded, 2) + "/" + bytesToSize(e.total, 2));
            statusObject.progress(percentComplete * 100);
        }

    }

    function transferComplete(e) {
        statusObject.reset();
        statusObject.flush();
    }
};