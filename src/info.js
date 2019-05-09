var inquirer = require('inquirer');
var util = require('./util');
var config = require('./config');

module.exports = {
    //获取模板列表
    getTemplates(callback){
        util.get(config.organization_repositories_url, function(err, result){
            if(err){
                console.log(err);
                return;
            }
            let info = JSON.parse(result);
            let temps = [];
            info.forEach(function(p) {
                temps.push({
                    name: p.name,
                    description: p.description,
                    tagsUrl: p.tags_url
                })
            });
            callback(temps);
        })
    },
    //设置模板选项
    showTemplateList(templates, callback){
        var list = [];
        templates.forEach(function(template) {
            list.push(template.name);
        });
        inquirer.prompt([{
            type: 'list',
            name: 'template',
            message: 'Which template do you want?',
            choices: list
        }])
        .then(answers => {
            callback(answers.template);
        });
    },
    //获取标签列表
    getTags(url, callback){
        util.get(url, function(err, result){
            if(err){
                console.log(err);
                return;
            }
            let info = JSON.parse(result);
            let tags = [];
            info.forEach(function(p) {
                tags.push({
                    name: p.name,
                    zipUrl: p.zipball_url
                })
            });
            callback(tags);
        })
    },
    //设置标签选项
    showTagList(tags, callback){
        var list = [];
        tags.forEach(function(tag) {
            list.push(tag.name);
        });
        inquirer.prompt([{
            type: 'list',
            name: 'tag',
            message: 'Which tag do you want?',
            choices: list
        }])
        .then(answers => {
            callback(answers.tag);
        });
    },
}
