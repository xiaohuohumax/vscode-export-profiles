# .code-profile file Rule


## root

```json
{
  "name": "名称",
  "extensions?": "<extensions>(json array)",
  "settings?": "<settings>(json object)",
  "keybindings?": "<keybindings>(json object)",
  "snippets?": "<snippets>(json object)"
}
```

### \<extensions\>

```json
[
  {
    "identifier": {
      "id": "string",
      "uuid": "string"
    },
    "displayName?": "string"
  },
  // ...
]
```

### \<settings\>

```json
{
  // 注释
  "[key:string]": "any(setting value)"
}
```

### \<keybindings\>

```json
{
  "keybindings": "<keybindings-data>(json array)"
}
```

#### \<keybindings-data\>
```json
[
  {
    "key": "string",
    "command": "string",
    "when?": "string"
  },
  // ...
]
```

### \<snippets\>

```json
{
  "snippets": "<snippets-data>(json array)"
}
```

#### \<snippets-data\>
```json
{
  "[key:string(file name)]": "string(snippet content)",
  // ...
}
```