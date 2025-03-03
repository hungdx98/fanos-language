import { FileSystem } from './FileSystem'

export class LanguageService {

  static processLanguageSheet(values) {
    const columnCount = values.reduce((_total, item) => {
      return Math.max(_total, item.length)
    }, 0)
    const rowCount = values.length

    const results = []
    for(let i = 1; i < columnCount; i++) {
      results.push({
        language: values[0][i],
        value: {},
        valueCount: 0
      })
    }
    const addWord = (langId, key, value) => {
      if (!value) {
        return
      }
      const langData = results[langId].value
      const keyParts = key.split('.')
      let parentData = langData
      for(let i = 0; i < keyParts.length - 1; i++) {
        const childKey = keyParts[i]
        let childData = parentData[childKey]
        if (!childData) {
          childData = {}
          parentData[childKey] = childData
        }
        parentData = childData
      }
      const finalKey = keyParts[keyParts.length - 1]
      parentData[finalKey] = value
      results[langId].valueCount++
    }

    for(let i = 1; i < rowCount; i++) {
      const row = values[i]
      for (let j = 1; j < row.length; j++) {
        addWord(j - 1, row[0], row[j])
      }
    }

    return results
  }

  static processLanguageModule(module) {
    const mod = require(module)
    return createDictionary(mod.default, '')
  }

  static processLanguageJson(path) {
    const json = FileSystem.readJsonFromFile(path)
    return createDictionary(json, '')
  }
}

function createDictionary(res, parent) {
  const results = []
  for(let key in res) {
    const value = res[key]
    if (typeof value === 'object') {
      const subResults = createDictionary(value, `${parent}${key}.`)
      for(let i = 0; i < subResults.length; i++) {
        results.push(subResults[i])
      }
    }
    else {
      results.push([
        `${parent}${key}`,
        value
      ])
    }
  }
  return results
}
