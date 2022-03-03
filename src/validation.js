const identity = x => x

export const use = xs => xs.reduceRight(
  (a, x) => x(a),
  identity
)

const optional = next => value => {
  return value == null ? null : next(value)
}

const required = next => value => {
  if (value != null) {
    return next(value)
  } else {
    throw new Error(`${typeof value} is required`)
  }
}

const default_ = defaultValue => next => value => {
  return next(value == null ? defaultValue : value)
}

const typeOf = type => next => value => {
  // eslint-disable-next-line valid-typeof
  if (typeof value === type) {
    return next(value)
  } else {
    throw new Error(`${typeof value} is not a type ${type}`)
  }
}

const instanceOf = constructor => next => value => {
  if (value instanceof constructor) {
    return next(value)
  } else {
    throw new Error(`${value.constructor.name} is not an instance of ${constructor.name}`)
  }
}

export const element = instanceOf(HTMLElement)

export const elements = next => value => {
  const xs = (() => {
    if (Array.isArray(value)) {
      return value
    } else if (value instanceof NodeList || value instanceof HTMLCollection) {
      return Array.from(value)
    } else {
      return [value]
    }
  })()

  return next(xs.map(use([element])))
}

export const requiredElement = use([required, element])
export const optionalElement = use([optional, element])
export const optionalElements = use([optional, elements])
export const optionalFunction = use([optional, typeOf('function')])
export const optionalString = use([optional, typeOf('string')])
export const defaultString = (value, label) => use([default_(label), typeOf('string')])(value)
