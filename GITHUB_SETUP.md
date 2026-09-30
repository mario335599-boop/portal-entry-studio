# はじめてのGitHub公開手順

このアプリは、空の作業フォルダーから作成した独立した新規プロジェクトです。参考として挙げられた他者のツール・リポジトリ・コード・デザインは使用していません。PDF.js等の汎用ライブラリは、それぞれのライセンスに従って使用しています。

## 今回お願いする操作

アプリ本体の作成・ローカルテスト後に、以下を行ってください。今はファイルのアップロードやPages設定は不要です。

1. [GitHub](https://github.com/) を開き、ご自身のアカウントでログインします。
2. [新しいリポジトリを作成する画面](https://github.com/new) を開きます。
3. **Owner** がご自身のユーザー名であることを確認します。
4. **Repository name** に `portal-entry-studio` を入力します。
5. **Description** は任意です。例: `LINE不動産 Portal Entry Studio`。
6. 無料プランでGitHub Pagesを使う場合は **Public** を選びます。これはアプリのソースコードとWebアプリが公開される設定です。アプリへ登録する販売図面・案件データはブラウザ内に保存され、GitHubへアップロードする対象ではありません。[GitHub公式説明](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
7. **Add README** はオフ、**Add .gitignore** は `None`、**Choose a license** は `None` にします。READMEと.gitignoreは今回のプロジェクトに作成済みです。アプリ独自コードのライセンスは今回選びません。
8. **Create repository** をクリックします。
9. 開いた画面のURLをコピーして、この会話へ送ってください。

URLは次の形です。

```text
https://github.com/あなたのユーザー名/portal-entry-studio
```

空のリポジトリで「Quick setup」などが表示されれば正常です。そこにあるコマンドを実行する必要はありません。パスワードやトークンを会話へ貼り付けないでください。

## URLをいただいた後の流れ

1. 作成したリポジトリへ今回のソースコードと自動デプロイ設定を配置します。接続に認証が必要な場合は、その段階でGitHubの正規の認証画面に沿って案内します。
2. リポジトリの **Settings → Pages** を開きます。
3. **Build and deployment → Source** で **GitHub Actions** を選びます。
4. **Actions** タブで `Deploy Portal Entry Studio to GitHub Pages` を実行し、成功を確認します。
5. 次のURLでアプリを確認します。

```text
https://あなたのユーザー名.github.io/portal-entry-studio/
```

この自動配信方式は[GitHub公式のPages設定手順](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)に沿っています。Webアプリの公開と、不動産ポータルでの物件公開は別です。本アプリに物件を公開する機能はありません。

## アップロードしないもの

実案件の販売図面PDF、案件バックアップJSON、認証情報、`node_modules/` は送信しません。自動テストのPDFは架空の物件データです。

ソース配置前はPagesの画面で選べる項目が少ない場合があります。まず空のリポジトリ作成とURLの連絡までで止めてください。
