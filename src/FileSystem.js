import fs from 'fs'
import path from 'path'

function isValidIdentifier(key) {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)
}

function escapeString(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}

function formatValue(val, indentLevel = 0) {
  const indent = '  '.repeat(indentLevel)
  const innerIndent = '  '.repeat(indentLevel + 1)

  if (val === null || val === undefined) {
    return 'null'
  }
  if (typeof val === 'string') {
    return `'${escapeString(val)}'`
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return String(val)
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]'
    const items = val.map(item => `${innerIndent}${formatValue(item, indentLevel + 1)}`).join(',\n')
    return `[\n${items}\n${indent}]`
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val)
    if (keys.length === 0) return '{}'
    const entries = keys.map((k) => {
      const formattedKey = isValidIdentifier(k) ? k : `'${escapeString(k)}'`
      return `${innerIndent}${formattedKey}: ${formatValue(val[k], indentLevel + 1)}`
    })
    return `{\n${entries.join(',\n')}\n${indent}}`
  }
  return String(val)
}

export function formatJsModule(varName, obj) {
  const formattedObj = formatValue(obj, 0)
  return `const ${varName} = ${formattedObj}\n\nexport default ${varName}\n`
}

export class FileSystem {
  static readJsonFromFile(filePath) {
    try {
      const content = fs.readFileSync(filePath)
      return JSON.parse(content)
    }
    catch (err) {
      console.log('Error reading file:', err.toString())
    }
    return null
  }

  static writJsonToFile(filePath, obj) {
    try {
      const dir = path.dirname(filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      const content = JSON.stringify(obj, null, 2)
      fs.writeFileSync(filePath, content)
      return true
    }
    catch (err) {
      console.log('Error writing file:', err.toString())
    }
    return false
  }

  static writeJsModuleToFile(filePath, obj, varName) {
    try {
      const dir = path.dirname(filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      const inferredVarName = varName || path.basename(filePath, path.extname(filePath)).replace(/[^a-zA-Z0-9_$]/g, '_') || 'data'
      const content = formatJsModule(inferredVarName, obj)
      fs.writeFileSync(filePath, content, 'utf8')
      return true
    }
    catch (err) {
      console.log('Error writing file:', err.toString())
    }
    return false
  }
}
