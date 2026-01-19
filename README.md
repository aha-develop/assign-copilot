# Assign to Copilot
  
This is an extension for [Aha! Develop](https://www.aha.io/develop) providing integration with [GitHub Copilot](https://github.com/features/copilot).
Assign Features and Requirements to Copilot directly from Aha! Develop.

## Demo

[demo.mp4](https://github.com/user-attachments/assets/bdc8011e-7b14-4184-a03a-2c40b00df806)


## Installing the extension

**Note: In order to install an extension into your Aha! Develop account, you must be an account administrator.**

TODO: Fill in a link to your built extension package
Install the Assign to Copilot extension by clicking [here](https://secure.aha.io/settings/account/extensions/install?url=).

## Working on the extension

Install [`aha-cli`](https://github.com/aha-app/aha-cli):

```sh
npm install -g aha-cli
```

Clone the repo:

TODO: Add the repository URL here
```sh
git clone ...
```

**Note: In order to install an extension into your Aha! Develop account, you must be an account administrator.**

Install the extension into Aha! and set up a watcher:

```sh
aha extension:install
aha extension:watch
```

Now, any change you make inside your working copy will automatically take effect in your Aha! account.

## Building

When you have finished working on your extension, package it into a `.gz` file so that others can install it:

```sh
aha extension:build
```

After building, you can upload the `.gz` file to a publicly accessible URL, such as a GitHub release, so that others can install it using that URL.

To learn more about developing Aha! Develop extensions, including the API reference, the full documentation is located here: [Aha! Develop Extension API](https://www.aha.io/support/develop/extensions)
