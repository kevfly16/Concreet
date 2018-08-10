# Concreet

A web app that lets users add/edit and share notes. The notes have primarily text with some images and other embedded content and links. The app is collaborative with multiple users being able to make changes.

## Features:
- [x] It should be mobile friendly
- [x] A user can create a note
- [x] A user can add a title to a note
- [x] A user can add text content to a note
- [x] A user can add a note to a folder
- [x] A user can add a name to a folder
- [x] A user can rename a note
- [x] A user can rename a folder
- [x] A user can edit the content in a note
- [x] A user can login to the website and only then access the content
- [x] Multiple users have access to the content, with all of the features mentioned above
- [x] Each note has a unique (url) link, which can be shared
- [x] A user can add a link to an image. It fetches the image and displays it. An image preview is displayed in the image. ie the image is embedded in the note.
- [x] A user can add a link and a link is displayed. (If not an image). Clicking on the link takes the user to the appropriate url in a new tab.
- [x] Display a list of folders
- [x] Display a list of notes in a selected folder (in order of last edit)
- [x] A save button, all changes should be saved on click (in case of user conflicts, select the most recent)
- [x] **BONUS**: Store different version of the document with time stamps. Allow a user to go back to any version.
- [x] **BONUS**: Also store who was the user who edited it
- [ ] **BONUS**: Auto save the content without the save button, as soon as changes happen.

## Know Issues / Improvements:
- Some of the UX design could be improved. Some workflows aren't as efficient, intuitive, or easy as they can be.
- There are potential issues with race conditions that I haven't had the chance to go through and completely test. Assuming MongoDB handles asymptotic writes properly there shouldn't be anything fatal.
- The mobile experience is not ideal. It's usable, but many screens look messy.

## Infra:
<img src="https://getdeveloper.net/wp-content/uploads/2018/02/semantic.png" width="150"> <img src="http://pluspng.com/img-png/nodejs-logo-png-node-js-development-296.png" width="150"> <img src="https://cacm.acm.org/system/assets/0002/7119/042117_Theodo_MongoDB.large.jpg?1492791427&1492791427" width="150"> <img src="https://dailysmarty-production.s3.amazonaws.com/uploads/post/img/509/feature_thumb_heroku-logo.jpg" width="150"> <img src="https://www.electronicsmedia.info/wp-content/uploads/2017/08/Mlab.png" width="150"> <img src="https://camo.githubusercontent.com/a43de8ca816e78b1c2666f7696f449b2eeddbeca/68747470733a2f2f63646e2e7261776769742e636f6d2f7075676a732f7075672d6c6f676f2f656563343336636565386664396431373236643738333963626539396431663639343639326330632f5356472f7075672d66696e616c2d6c6f676f2d5f2d636f6c6f75722d3132382e737667" width="150">
