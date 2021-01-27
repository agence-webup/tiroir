const isElementNode = node => node.nodeType === Node.ELEMENT_NODE
const isTextNode = node => node.nodeType === Node.TEXT_NODE

const isElementName = name => node => isElementNode(node) && node.nodeName === name
const isUl = isElementName('UL')
const isLi = isElementName('LI')
const isA = isElementName('A')
const isButton = isElementName('BUTTON')

const normalizeAttributes = (denyList, attributes) => Object.fromEntries(
  Array.from(attributes)
    .filter(attribute => !denyList.includes(attribute.name))
    .map(attribute => [attribute.name, attribute.nodeValue])
)

const parseItem = node => {
  if (isLi(node)) {
    const children = Array.from(node.childNodes)

    const childList = children.find(isUl)
    const childLink = children.find(isA)
    const childButton = children.find(isButton)
    if (!(childList || childLink)) {
      throw new Error('Invalid item : children does not have ul or a')
    }
    const items = childList ? parseList(childList) : null
    const link = childLink ? childLink.href : null
    const label = (childLink || childButton) ? (childLink || childButton).textContent : children.filter(isTextNode).reduce((a, x) => a + x.nodeValue, '')
    const attributes = childLink
      ? normalizeAttributes(['href'], childLink.attributes)
      : childButton
        ? normalizeAttributes(['type'], childButton.attributes)
        : {}

    return {
      items,
      link,
      label,
      attributes
    }
  } else {
    throw new Error('Invalid item : node is not a li ')
  }
}

const parseList = node => {
  if (isUl(node)) {
    return Array.from(node.childNodes)
      .filter(isElementNode)
      .map(parseItem)
  } else {
    throw new Error('Invalid list : node is not a ul')
  }
}

const parseContainer = node => {
  if (isUl(node)) {
    return parseList(node)
  } else {
    const children = Array.from(node.childNodes)
    if (children.some(isUl)) {
      return parseList(children.find(isUl))
    } else {
      throw new Error('Invalid content : node have no ul child')
    }
  }
}

export default parseContainer
