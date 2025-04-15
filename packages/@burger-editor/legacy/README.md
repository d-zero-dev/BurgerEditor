# @burger-editor/legacy

BurgerEditor v3までのブロックとアイテム（旧名:タイプ）のHTMLテンプレートを参照できるパッケージ。

```ts
import { blocks, items } from '@burger-editor/legacy/v3';

// 中身はHTML文字列
blocks; // { [blockName: string]: string }
items; // { [exTypeName: string]: string }
```
