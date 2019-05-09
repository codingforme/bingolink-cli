#!/usr/bin/env node

var yargs = require("yargs");
var info = require("./info.js");

var args = yargs
    .command({
        command: "create <name>",
        desc: "Create a bingolink template.",
        builder: {},
        handler: function(argv) {
            //1.获取模板列表
            info.getTemplates(function(templates){
                //2.设置选项
                info.showTemplateList(templates, (templateName) => {
                    var t = templates.find((template) => {
                        return template.name == templateName;
                    });
                    //3.获取标签列表
                    info.getTags(t.tagsUrl, (tags) => {
                        //4.设置选项
                        info.showTagList(tags, (tagName) => {
                            var tag = tags.find((tag) => {
                                return tag.name == tagName;
                            });
                            console.log(tag)
                        })
                    })
                })
            })
        }
    })
    .version() // Use package.json's version
    .help()
    .alias({
        "h": "help",
        "v": "version"
    })
    .strict(true)
    .demandCommand()
    .argv;
