import { parse as postcssParse } from 'postcss'
import merge from 'lodash.merge'

const parse = css => {
  const ast = typeof css === 'string' ? postcssParse(css) : css
  let result = {}

  ast.nodes.forEach(node => {
    if (node.type === 'rule') {
      const declarations = { }

      node.nodes.forEach(dcl => {
        if (dcl.type !== 'decl') {
          return
        }
        declarations[dcl.prop] = dcl.value
      })

      result = merge(result, { [node.selector]: declarations })
    } else if (node.type === 'atrule' && node.nodes) {
      result = merge(result, { [`@${node.name} ${node.params}`]: parse(node) })
    }
  })

  return result
}

const isAtRule = selector => selector.startsWith('@')
const indent = level => '  '.repeat(level)

const toString = (css, level = 0) => {
  let result = ''

  Object.keys(css).forEach(selector => {
    result = `${result}${indent(level)}${selector} {\n`

    if (isAtRule(selector)) {
      result = `${result}${toString(css[selector], level + 1)}`
    } else {
      Object.keys(css[selector]).forEach(prop => {
        result = `${result}${indent(level + 1)}${prop}: ${css[selector][prop]};\n`
      })
    }

    result = `${result}${indent(level)}}\n`
  })

  return result
}

const addProp = (diff, selector, prop, value) => {
  if (diff[selector]) {
    diff[selector][prop] = value
  } else {
    diff[selector] = {
      [prop]: value
    }
  }

  return diff
}

const diffObjects = (sourceObject, reversedObject) => {
  let diff = {}

  Object.keys(reversedObject).forEach(selector => {
    if (isAtRule(selector)) {
      diff = merge(diff, {
        [selector]: sourceObject[selector]
          ? diffObjects(sourceObject[selector], reversedObject[selector])
          : reversedObject[selector]
      })

      return
    }

    Object.keys(reversedObject[selector]).forEach(prop => {
      if (sourceObject[selector][prop]) {
        if (sourceObject[selector][prop] !== reversedObject[selector][prop]) {
          diff = addProp(diff, selector, prop, reversedObject[selector][prop])
        }
      } else {
        diff = addProp(diff, selector, prop, reversedObject[selector][prop])
      }
    })
  })

  return diff
}

const cssDiff = (source, reversed) => {
  let isStringified = false

  try {
    source = JSON.parse(source)
    reversed = JSON.parse(reversed)
    isStringified = true
  } catch (e) {}

  const sourceObject = parse(source)
  const reversedObject = parse(reversed)
  let diff = diffObjects(sourceObject, reversedObject)

  diff = toString(diff)

  if (isStringified) {
    diff = JSON.stringify(diff)
  }

  return diff
}

module.exports = cssDiff
module.exports.parse = parse
module.exports.toString = toString
