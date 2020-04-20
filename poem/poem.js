const osmosis = require("osmosis");
const sbd = require("sbd");
const syllable = require("syllable");
const pos = require("pos");
const lexer = new pos.Lexer();
const tagger = new pos.Tagger();
const rhyme = require("rhyme");
const fs = require("fs");

const filePath = "poem/SW_EpisodeIV.txt";



function getRandomElement(array){
    return array[Math.floor(Math.random()* array.length)];
}

function scramble(array){
    for(let i = 0; i < array.length; i++){
        const randomIndex = Math.floor(Math.random() * array.length);
        const tmp = array[randomIndex];
        array[randomIndex] = array[i];
        array[i] = tmp;
    }
}

function cleanText(text){
    //find andy place where you have two brackets and a number and delete it
    return text.replace(/\[[0-9]+\]/g, "");
}

function newLines(text){
    return text.split(/\r?\n/g);
}

function cleanLines(text){
    return text.replace(/["]/g, "");
}

function splitQuotes(text){
    return text.match(/"[^"]+"/g);
}

function cleanUpAdLibs(text)
{
    results = [];
    const regex = RegExp(/[\u2022].*/g); // bullet point
    let lines = newLines(text[0]);
    lines.forEach(line =>{
        //check for bullet point
        if(regex.test(line)){
            //remove bullet point
            results.push(line.replace(/[\u2022]/g, ""));
        }
    });
    
    return results;
}

function findLastWord(lexes){
    const regex = RegExp(/[.,:!?]/);
    let lastWord = "";
    for(let i = 0; i < lexes.length; i++){
        lastWord = lexes[lexes.length - 1 - i];
        if(!regex.test(lastWord)) return lastWord;
    }
    return lastWord;
}

async function getText(){
    
    return new Promise((resolve,reject) =>{
        let text = [];
        osmosis.get("https://en.wikipedia.org/wiki/Justin_Bieber")
                .find("p")
                .set("contents")
                .data((item) => text.push(item.contents))
                .done(() => resolve(text))
                .error((e) => reject(e));
    });
}
async function getLocalText() {
    let text;
    return new Promise((resolve,reject) => {
        fs.readFile(filePath, (err, data) => { 
            if (err) throw err; 
          
            text = data.toString(); 
            resolve(text);
        });
    });
}
async function getAdLibText(){
    return new Promise((resolve,reject) =>{
        let text = [];
        osmosis.get("https://genius.com/Rap-genius-ad-libs-explained-lyrics")
                .find("p")
                .set("contents")
                .data((item) => text.push(item.contents))
                .done(() => resolve(text))
                .error((e) => reject(e));
    });
}

async function loadRhymingDictionary(){
    return new Promise((resolve) => {
        rhyme((rhymingDictionary) => {
            resolve(rhymingDictionary)
        });
    });
}

async function firstWordPoem () {
    const paragraphs = await getText();
    let firstWords = [];
    paragraphs.forEach( paragraph => {
        const firstWord = paragraph.split(" ")[0];
        firstWords.push(firstWord);
    });
    return firstWords;
}

async function haikuPoem() {
    const paragraphs = await getText();
    let fragments = [];
    paragraphs.forEach(pg =>{
        let cleanpg = cleanText(pg);
        const sentences = sbd.sentences(cleanpg);
        sentences.forEach(sentence => {
            const chunks = sentence.split(",");
            fragments = fragments.concat(chunks);
        })

    });

    const fiveSyllableFragments = fragments.filter(fragment =>{
        return syllable(fragment) === 5;
    });
    const sevenSyllableFragments = fragments.filter(fragment =>{
        return syllable(fragment) === 7;
    });

    scramble(fiveSyllableFragments);
    scramble(sevenSyllableFragments);

    return [
        fiveSyllableFragments[0],
        sevenSyllableFragments[0],
        fiveSyllableFragments[1]
    ]
}

async function posPoem(){
    const paragraphs = await getText();
    const posTypes = ["VBG"];
    const tokens = [];
    paragraphs.forEach(pg => {
        const cleanpg = cleanText(pg);
        const sentences = sbd.sentences(cleanpg);
        sentences.forEach(sentence => {
            const lexes = lexer.lex(sentence);
            const tags = tagger.tag(lexes);
            tags.forEach(tag => {
                if (posTypes.includes(tag[1])){
                    //ignore duplicates
                    if(!tokens.includes(tag[0])){
                        tokens.push(tag[0]);
                    }
                }
            })
        });
    });

    return tokens;
}

async function rhymePoem(){
    const paragraphs = await getText();
    const rhymeGroups = {};
    const rd = await loadRhymingDictionary();
    paragraphs.forEach(pg => {
        const cleanpg = cleanText(pg);
        const sentences = sbd.sentences(cleanpg);
        sentences.forEach(sentence => {
            const lexes = lexer.lex(sentence);
            for(let i = 0; i < lexes.length - 5; i++){
                const fragment = lexes.slice(i, i+5);
                const lastWord = fragment.slice(-1)[0]; // gives you the last word
                const pronunciations = rd.pronounce(lastWord); // an array of pronunciations for this word
                if(pronunciations){
                    const pronunciation = pronunciations[0];
                    const rhymeClass = pronunciation.slice(-3).join("-");
                    if(!rhymeGroups[rhymeClass]) rhymeGroups[rhymeClass] = [];
                    rhymeGroups[rhymeClass].push(fragment);
                }
            }
        });
    });


    let goodKeys = Object.keys(rhymeGroups);
    //filters out an fragments that only rhyme with themselves
    goodKeys = goodKeys.filter(key => {
        const fragments = rhymeGroups[key];
        return !fragments.every( fragment => {
            return fragment.slice(-1)[0].toLowerCase() === fragments[0].slice(-1)[0].toLowerCase();
        });
    });
    function getRhymingPair() {
        scramble(goodKeys);
        const rhymeClass = goodKeys[0];
        const rhymingFragments = rhymeGroups[rhymeClass];
        scramble(rhymingFragments);
        const frag1 = rhymingFragments[0];
        const lastWord = frag1.slice(-1)[0];
        const otherValidFragments = rhymingFragments.filter(otherFragment => {
            // Get
            const otherLastWord = otherFragment.slice(-1)[0];
            return otherLastWord !== lastWord;
        });
        const frag2 = otherValidFragments[0];
        return [ frag1.join(" "), frag2.join(" ")];
    }
    let lines = [];
    for (let i = 0; i < 3; i ++){
        const pair1 = getRhymingPair();
        const pair2 = getRhymingPair();
        lines.push(pair1[0]);
        lines.push(pair2[0]);
        lines.push(pair1[1]);
        lines.push(pair2[1]);
    }
    lines = lines.concat(getRhymingPair());

    return lines;
}

async function starWarsRap(){
    let results = [];
    let rhymeGroups = {};
    let characterQuotes = {};
    const text = await getLocalText();
    const adlibs = await getAdLibText();
    let adlibArray = cleanUpAdLibs(adlibs);
    const rd = await loadRhymingDictionary();
    let lines  = newLines(text);
    lines.forEach(line => {
        let newLine = [];
        let splitLine  = splitQuotes(line);
        splitLine.forEach(part =>{
            part = cleanLines(part);
            newLine.push(part);
        });
        newLine.shift();
        const character = newLine[0];
        const dialogue = newLine[1];
        if(!characterQuotes[character]) characterQuotes[character] = [];
        characterQuotes[character].push(dialogue);
        const sentences = sbd.sentences(dialogue);
        sentences.forEach(sentence => {
            const lexes = lexer.lex(sentence);
            const lastWord = findLastWord(lexes);
            const pronunciations = rd.pronounce(lastWord); // an array of pronunciations for this word
            if(pronunciations){
                const pronunciation = pronunciations[0];
                const rhymeClass = pronunciation.slice(-3).join("-");
                if(!rhymeGroups[rhymeClass]) rhymeGroups[rhymeClass] = [];
                // lexes.unshift(`${character}:`);
                rhymeGroups[rhymeClass].push(lexes);
                //results.push(lexes);
            }
            // for(let i = 0; i < lexes.length - 5; i++){
            //     let fragment = lexes.slice(i, i+5);
            //     const lastWord = fragment.slice(-1)[0]; // gives you the last word
            //     const pronunciations = rd.pronounce(lastWord); // an array of pronunciations for this word
            //     if(pronunciations){
            //         const pronunciation = pronunciations[0];
            //         const rhymeClass = pronunciation.slice(-3).join("-");
            //         if(!rhymeGroups[rhymeClass]) rhymeGroups[rhymeClass] = [];
            //         fragment.unshift(`${character}:`);
            //         rhymeGroups[rhymeClass].push(fragment);
            //         //results.push(fragment);
            //     }
            // }
            //results.push(sentence);
        });
        //results.push(sentences);
    });

    let characterKeys = Object.keys(characterQuotes);

    let goodKeys = Object.keys(rhymeGroups);
    //filters out an fragments that only rhyme with themselves
    goodKeys = goodKeys.filter(key => {
        const fragments = rhymeGroups[key];
        const firstLastWord = findLastWord(fragments[0]);
        return !fragments.every( fragment => {
            currentLastWord = findLastWord(fragment);
            return currentLastWord.toLowerCase() === firstLastWord.toLowerCase();
        });
    });
    function getRhymingPair() {
        scramble(goodKeys);
        const rhymeClass = goodKeys[0];
        const rhymingFragments = rhymeGroups[rhymeClass];
        scramble(rhymingFragments);
        const frag1 = rhymingFragments[0];
        const lastWord = findLastWord(frag1);
        const otherValidFragments = rhymingFragments.filter(otherFragment => {
            const otherLastWord = findLastWord(otherFragment);
            return otherLastWord !== lastWord;
        });
        const frag2 = otherValidFragments[0];
        return [frag1.join(" "), frag2.join(" ")];
    }

    function getAdLib() {
        
        scramble(adlibArray);
        return(adlibArray[0]);
    }

    function getCharacter(){
        scramble(characterKeys);
        return characterKeys[0];
    }
    //const pair = getRhymingPair();
    let rapLines = [];
    const adLibber = getCharacter();
    const rapper = getCharacter()
    for (let i = 0; i < 2; i ++){
        const pair1 = getRhymingPair();
        const pair2 = getRhymingPair();
        
        rapLines.push(rapper + ": " + pair1[0]);
        rapLines.push(rapper + ": " + pair1[1]);
        rapLines.push(adLibber + ":(" + getAdLib() + "!)");
        rapLines.push(rapper + ": " + pair2[0]);
        rapLines.push(rapper + ": " + pair2[1]);
        rapLines.push(adLibber + ":(" + getAdLib()+ "!)");
    }

    return rapLines;
}

async function makePoem() {
    //return firstWordPoem();
    // return haikuPoem();
    //return posPoem();
    // return rhymePoem();
    return starWarsRap();
}

if (require.main === module) {
    //getText().then(text => console.log(text));
    makePoem().then(res => console.log(res));
}

module.exports = {
    makePoem
};
