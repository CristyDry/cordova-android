/*
       Licensed to the Apache Software Foundation (ASF) under one
       or more contributor license agreements.  See the NOTICE file
       distributed with this work for additional information
       regarding copyright ownership.  The ASF licenses this file
       to you under the Apache License, Version 2.0 (the
       "License"); you may not use this file except in compliance
       with the License.  You may obtain a copy of the License at

         http://www.apache.org/licenses/LICENSE-2.0

       Unless required by applicable law or agreed to in writing,
       software distributed under the License is distributed on an
       "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
       KIND, either express or implied.  See the License for the
       specific language governing permissions and limitations
       under the License.
*/

/*
 * create a cordova/android project
 *
 * USAGE
 *  ./create [path package activity]
 */

var fso = WScript.CreateObject('Scripting.FileSystemObject');

function read(filename) {
    var fso=WScript.CreateObject("Scripting.FileSystemObject");
    var f=fso.OpenTextFile(filename, 1);
    var s=f.ReadAll();
    f.Close();
    return s;
}
function write(filename, contents) {
    var fso=WScript.CreateObject("Scripting.FileSystemObject");
    var f=fso.OpenTextFile(filename, 2, true);
    f.Write(contents);
    f.Close();
}
function replaceInFile(filename, regexp, replacement) {
    write(filename, read(filename).replace(regexp, replacement));
}
function exec(s, output) {
    var o=shell.Exec(s);
    while (o.Status == 0) {
        WScript.Sleep(100);
    }
    //WScript.Echo("Command exited with code " + o.Status);
}

function cleanup() {
    // Cleanup
//    if(fso.FileExists(ROOT + '\\framework\\libs\\commons-codec-1.6.jar')) {
//        fso.DeleteFile(ROOT + '\\framework\\libs\\commons-codec-1.6.jar');
//        fso.DeleteFolder(ROOT + '\\framework\\libs', true);
//    }
    if(fso.FileExists(ROOT + '\\framework\\cordova-'+VERSION+'.jar')) {
        fso.DeleteFile(ROOT + '\\framework\\cordova-'+VERSION+'.jar');
    }
    if(fso.FileExists(ROOT + '\\framework\\assets\\www\\cordova-'+VERSION+'.js')) {
        fso.DeleteFile(ROOT + '\\framework\\assets\\www\\cordova-'+VERSION+'.js');
    }
}

function downloadCommonsCodec() {
    if (!fso.FileExists(ROOT + '\\framework\\libs\\commons-codec-1.6.jar')) {
      // We need the .jar
      var url = 'http://mirror.symnds.com/software/Apache//commons/codec/binaries/commons-codec-1.6-bin.zip';
      var libsPath = ROOT + '\\framework\\libs';
      var savePath = libsPath + '\\commons-codec-1.6-bin.zip';
      if (!fso.FileExists(savePath)) {
        if(!fso.FolderExists(ROOT + '\\framework\\libs')) {
            fso.CreateFolder(libsPath);
        }
        // We need the zip to get the jar
        var xhr = WScript.CreateObject('MSXML2.XMLHTTP');
        xhr.open('GET', url, false);
        xhr.send();
        if (xhr.status == 200) {
          var stream = WScript.CreateObject('ADODB.Stream');
          stream.Open();
          stream.Type = 1;
          stream.Write(xhr.ResponseBody);
          stream.Position = 0;
          stream.SaveToFile(savePath);
          stream.Close();
        } else {
          WScript.Echo('Could not retrieve the commons-codec. Please download it yourself and put into the framework/libs directory. This process may fail now. Sorry.');
        }
      }
      var app = WScript.CreateObject('Shell.Application');
      var source = app.NameSpace(savePath).Items();
      var target = app.NameSpace(ROOT + '\\framework\\libs');
      target.CopyHere(source, 256);
      
      // Move the jar into libs
      fso.MoveFile(ROOT + '\\framework\\libs\\commons-codec-1.6\\commons-codec-1.6.jar', ROOT + '\\framework\\libs\\commons-codec-1.6.jar');
      
      // Clean up
      fso.DeleteFile(ROOT + '\\framework\\libs\\commons-codec-1.6-bin.zip');
      fso.DeleteFolder(ROOT + '\\framework\\libs\\commons-codec-1.6', true);
    }
}

var args = WScript.Arguments, PROJECT_PATH="example", 
    PACKAGE="org.apache.cordova.example", ACTIVITY="cordovaExample",
    shell=WScript.CreateObject("WScript.Shell");
    
// working dir
var ROOT = WScript.ScriptFullName.split('\\bin\\create.js').join('');

if (args.Count() == 3) {
    PROJECT_PATH=args(0);
    PACKAGE=args(1);
    ACTIVITY=args(2);
}

if(fso.FolderExists(PROJECT_PATH)) {
    WScript.Echo("Project already exists!");
    WScript.Quit(1);
}

var PACKAGE_AS_PATH=PACKAGE.replace(/\./g, '\\');
var ACTIVITY_PATH=PROJECT_PATH+'\\src\\'+PACKAGE_AS_PATH+'\\'+ACTIVITY+'.java';
var MANIFEST_PATH=PROJECT_PATH+'\\AndroidManifest.xml';
var TARGET=shell.Exec('android.bat list targets').StdOut.ReadAll().match(/id:\s([0-9]).*/)[1];
var VERSION=read(ROOT+'\\VERSION').replace(/\r\n/,'').replace(/\n/,'');

// create the project
exec('android.bat create project --target '+TARGET+' --path '+PROJECT_PATH+' --package '+PACKAGE+' --activity '+ACTIVITY);

// update the cordova framework project to a target that exists on this machine
exec('android.bat update project --target '+TARGET+' --path '+ROOT+'\\framework');

// pull down commons codec if necessary
downloadCommonsCodec();

exec('ant.bat -f '+ ROOT +'\\framework\\build.xml jar');

// copy in the project template
exec('cmd /c xcopy '+ ROOT + '\\bin\\templates\\project\\* '+PROJECT_PATH+' /S /Y');

// copy in cordova.js
exec('cmd /c copy '+ROOT+'\\framework\\assets\\www\\cordova-'+VERSION+'.js '+PROJECT_PATH+'\\assets\\www\\cordova-'+VERSION+'.js /Y');

// copy in cordova.jar
exec('cmd /c copy '+ROOT+'\\framework\\cordova-'+VERSION+'.jar '+PROJECT_PATH+'\\libs\\cordova-'+VERSION+'.jar /Y');

// copy in xml
exec('cmd /c copy '+ROOT+'\\framework\\res\\xml\\cordova.xml ' + PROJECT_PATH + '\\res\\xml\\cordova.xml /Y');
exec('cmd /c copy '+ROOT+'\\framework\\res\\xml\\plugins.xml ' + PROJECT_PATH + '\\res\\xml\\plugins.xml /Y');

// interpolate the activity name and package
replaceInFile(ACTIVITY_PATH, /__ACTIVITY__/, ACTIVITY);
replaceInFile(ACTIVITY_PATH, /__ID__/, PACKAGE);

replaceInFile(MANIFEST_PATH, /__ACTIVITY__/, ACTIVITY);
replaceInFile(MANIFEST_PATH, /__PACKAGE__/, PACKAGE);

cleanup();
