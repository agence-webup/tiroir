# Tiroir.js

A simple but complete drawer menu plugin in vanilla JavaScript

*⚠️ (Still in early development state)*

![Demo keyboard navigation](demo.webp)

## Documentation

### Installation

Method                     | Procedure
-------------------------- | ---------
NPM                        | *coming soon*
Download                   | [Download zip](https://github.com/agence-webup/tiroir/archive/main.zip)

Then Tiroir have some css you will have to add (feel free to custom it for a better integration in your UI):

```html
<link rel="stylesheet" href="dist/tiroir/tiroir.css">
```

Finally just link the Tiroir's code at the end of your document:

```html
<!-- Browser build -->
<script src="dist/tiroir/tiroir.min.js"></script>
```

Or as a JS module:
```js
// ES6 module build
import tiroir from 'Tiroir'
```

## Use

### Instantiate your menu
```javascript
var tiroir = new Tiroir({
  trigger: document.querySelectorAll('[data-tiroir-btn]') // If you alredy now which element clicks will open the menu
})
```

### Add content
You can create the content by yourself or use the API to build your navigation with a JSON/JS-Object (cf. below)

#### Use a server side rendered content

You can give an `HTML element` as `content` option to init object. The plugin will send it into the menu.

- If the content contain an element with a `data-tiroir-nav` attribute it gonna parse the contain and fill the stacking navigation with it.
- If the content contain an element with a `data-tiroir-footer` attribute it gonna send it into the sticky footer element

#### Add complex content with a JSON/JS-Object 

If you have a complex navigation or don't want your link to be indexed by search engines, you can fill the stacking navigation with a JSON/JS-Object using the `setItems()` function.

The object must respect this type of structure to be able to work:

 ```javascript
const items = [
    {
        label: 'Home',
        link: 'https://example.com/'
    },
    {
        label: 'Blog',
        items: [
            {
                label: 'Posts',
                attributes: { // You can pass custom html attributes
                    class: 'test'
                },
                link: 'https://example.com/blog/',
                items: [
                    {
                        label: 'My super post 1',
                        link: 'https://example.com/blog/test1',
                    },
                    {
                        label: 'My super post 2',
                        link: 'https://example.com/blog/test2',
                    },
                    {
                        label: 'My super post 3',
                        link: 'https://example.com/blog/test3',
                    },
                ]
            },
            {
                label: 'Videos',
                items: [
                    {
                        label: 'My first vlog',
                        link: 'https://example.com/videos/1',
                    },
                    {
                        label: 'My presentation video',
                        link: 'https://example.com/videos/2',
                    },
                    {
                        label: 'Vlog 2',
                        link: 'https://example.com/videos/3',
                    },
                ]
            },
        ]
    },
    {
        label: 'Contact',
        link: 'https://example.com/contact'
    },
]

const menu = new Tiroir()
menu.setItems(items)

```


## Options 

  Name             | Type              | Description
------------------ | ----------------- | -----------------------------------------
  trigger          | node list/element | Element(s) who will open the menu on click
  content          | node element      | Default menu content on load
  directionReverse | boolean           | Inverse the menu opening's direction (on the right by default)
  onOpen           | function          | Callback to execute when tiroir is opening
  onClose          | function          | Callback to execute when tiroir is closing
  resetLabel       | string            | Custom back-home button's label in the navigation
  currentLabel     | string            | Custom current prefix's label in the navigation



Example:
```javascript
const menu = new Tiroir({
  content: document.querySelector('[data-tiroir="menu-content"]'),
  trigger: document.querySelectorAll('[data-tiroir-btn]'),
  resetLabel: 'Back at first',
  currentLabel: 'All the ',
  onOpen: function () {
      console.log('menu opened')
  },
  onClose: function () {
      console.log('menu closed')
  }
});
```

## API

You can use the API to generate content and open or close your menu with JS:

Name                      | Parameter type(s)       | Description
------------------------- | ----------------------- | ----------
open()                    | *no parameter*          | Open your menu
close()                   | *no parameter*          | Close your menu
toggle()                  | *no parameter*          | Toggle your menu
setItems(items)           | JSON or JS Array        | Set a custom navigation (more info on the structure below)
parseItems(el)            | HTML element            | Parse a navigation container and fill the navigation with it
setContent(el)            | HTML element            | Set a custom content
setFooter(el)             | HTML element            | Set a custom content


Example:
```javascript
tiroir.setItems(navContent);
tiroir.open()
```

## Modify Tiroir.js

 1. Setup dependencies: `npm i` (or `npm ci` if you don't want to impact package-lock)
 2. Run hot-reloads server for development `npm run dev`
 3. (Build for production `npm run build`)


