import fs from 'fs'

export class FileSystem {
  static readJsonFromFile(path) {
    try {
      const content = fs.readFileSync(path)
      return JSON.parse(content)
    }
    catch (err) {
      console.log('Error reading file:', err.toString())
    }
    return null
  }

  static writJsonToFile(path, obj) {
    try {
      const content = JSON.stringify(obj, null, 2)
      fs.writeFileSync(path, content)
      return true
    }
    catch (err) {
      console.log('Error writing file:', err.toString())
    }
    return false
  }

  static writeJsModuleToFile(path, obj) {
    try {
      const content = `export default ${JSON.stringify(obj, null, 2)}`
      fs.writeFileSync(path, content)
      return true
    }
    catch (err) {
      console.log('Error writing file:', err.toString())
    }
    return false
  }
}
