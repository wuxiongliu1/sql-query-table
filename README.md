# Obsidian sql query table

this plugin is build from Obsidian Sample Plugin: https://github.com/obsidianmd/obsidian-sample-plugin

by use this plugin, you can query sql to query table . 

## usage 

For example, I have a table in one file . the table looks like below. 

|       date        | pay | income |
|:-----------------:|:----:| ---- |
| 2025-01-01 星期三 |  27  | 100  |
| 2025-01-01 星期三 |  34  | 200  |

^money


now if I want to know this year total pay and total income and money left, I can use sql to query this table.


~~~markdown
```table-sql
sql: 
- select  sum(`income`) as `total_income`,sum(`pay`) as `total_pay`, sum(`income`)- sum(`pay`) as `left` from ?
table: money
tablePath: repo/table_dir
```
~~~markdown

now you can  toggle to  view mode, the plugin will execute sql result and will render to table view like below.

| total_income | total_pay | left |
|:---:|:---:|----|
| 300 | 61  | 239 |

### explain every property

- sql : you can write sql here, this is a list, you can write multi sql , but you have to make sure all sql result have the same schema.

- table: table you want to query markdown table.

- tablePath: the table exists dir path or file path.  if this properties not set, plugin will search table in current file. If this property set, plugin will union the path table data  and current file table data.


## dependency

this plugin use alasql (https://github.com/AlaSQL/alasql) to execute sql. thanks alasql.

