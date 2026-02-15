export const generateShortDescription = (content: any[] = []) => {
  let tmpDescription = ''

  if (content && content.length > 0) {
    for (const block of content) {
      if (!block) continue

      if (block.text) {
        tmpDescription += `${block.text} `
      } else if (block.children && block.children.length > 0) {
        for (const child of block.children) {
          if (!child) continue

          if (child.text) {
            tmpDescription += `${child.text} `
          } else if (child.children && child.children.length > 0) {
            for (const grandChild of child.children) {
              if (!grandChild || !grandChild.text) continue

              tmpDescription += `${grandChild.text} `
            }
          }
        }
      }

      if (tmpDescription.length >= 100) {
        break
      }
    }
  }

  return tmpDescription.trim().slice(0, 100)
} // generateShortDescription
