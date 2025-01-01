# Obsidian sql query table

this plugin is build from Obsidian Sample Plugin: https://github.com/obsidianmd/obsidian-sample-plugin

by use this plugin, you can query sql to query table . 

For example

I have a table like this

|       日期        | 支出 | 收入 |
|:-----------------:|:----:| ---- |
| 2025-01-01 星期三 |  27  | 100  |
| 2025-01-01 星期三 |  34  | 200  |

^money


now you can use code block 

```table-sql
sql: 
- select  sum(`收入`) as `总收入`,sum(`支出`) as `总支出`, sum(`收入`)- sum(`支出`) as `结余` from ?
table: money
tablePath: repo/table_dir
```

sql : write sql place

table: table you want to query

tablePath: the table exists dir path or file path


when in view mode, the sql result will render to table view

| 总收入 | 总支出 | 结余 |
|:---:|:---:|----|
| 300 | 61  | 239 |


## dependency

use alasql (https://github.com/AlaSQL/alasql) to execute sql.

