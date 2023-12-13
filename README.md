# modulepreload

Inject modulepreload tags into HTML to remove the waterfall problem in loading web modules.

```sh
$ npm install --save-dev modulepreload
$ npx modulepreload inject -w index.html
```

Before injection:
```html
<!-- index.html -->
<html>
<head>
    <title>Example</title>
</head>
<body>
    <script type="module">
        import './dep.js'; // imports ./another-dep.js
    </script>
</body>
</html>
```

After injection:

```html
<!-- index.html -->
<html>
<head>
    <title>Example</title>
    <link rel="modulepreload" href="/dep.js" />
    <link rel="modulepreload" href="/another-dep.js" />
</head>
<body>
    <script type="module">
        import './dep.js'; // imports ./another-dep.js
    </script>
</body>
</html>
```