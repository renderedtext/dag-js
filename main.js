function transpose(matrix) {
  let rows = matrix.length;
  let cols = 0;

  for(let i=0; i < rows; i++) {
    let row = (matrix[i] || []);
    if(cols <= row.length > 0) {
      cols = row.length
    }
  }

  const grid = [];

  for (let j = 0; j < cols; j++) {
    grid[j] = Array(rows);
  }

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      grid[j][i] = matrix[i][j];
    }
  }

  return grid;
}

function avg(arr) {
  let sum = arr.reduce((previous, current) => current += previous);
  return sum / arr.length;
}

class SVGLine {
  static curved(p1, p2) {
    let path = document.createElementNS('http://www.w3.org/2000/svg', 'path')

    path.setAttribute('fill', 'none')
    path.setAttribute("stroke", "green")
    path.setAttribute("stroke-width", '3px')

    // http://blogs.sitepointstatic.com/examples/tech/svg-curves/cubic-curve.html
    path.setAttribute('d', `M ${p1[0]},${p1[1]} C ${p1[0] + 40},${p1[1]} ${p2[0] - 40},${p2[1]} ${p2[0]},${p2[1]}`)

    return path
  }

  static streight(p1, p2) {
    let path = document.createElementNS('http://www.w3.org/2000/svg', 'path')

    path.setAttribute('fill', 'none')
    path.setAttribute("stroke", "green")
    path.setAttribute("stroke-width", '3px')

    // http://blogs.sitepointstatic.com/examples/tech/svg-curves/cubic-curve.html
    path.setAttribute('d', `M ${p1[0]},${p1[1]} L ${p2[0]},${p2[1]}`)

    return path
  }
}

class Rank {
  //
  // Utility for calculating the "rank" of a node.
  //
  // The "rank" represents the depth of a node in a graph.
  //
  // Example:
  //
  //  a -> b -> d
  //    -> c ->
  //
  // Ranks for the above aexample would be:
  //
  //  a : 0
  //  b : 1
  //  c : 1
  //  d : 2
  //
  static calculate(nodeNames, deps) {

    return new Rank(nodeNames, deps).calculate()
  }

  constructor(nodeNames, deps) {
    this.nodeNames = nodeNames
    this.deps = deps
    this.ranks = {}
  }

  calculate() {
    this.nodeNames.forEach(n => {
      this.ranks[n] = this.calculateRank(n)
    })

    return this.ranks
  }

  calculateRank(nodeName) {
    // Memoized values to boost performance
    if(this.ranks[nodeName]) return this.ranks[nodeName];

    let deps = this.deps[nodeName]

    if(deps.length === 0) return 0;

    let parentRanks = deps.map(node => this.calculateRank(node))

    return Math.max(...parentRanks) + 1
  }
}

class Dagger {
  constructor(selector, options) {
    this.selector = selector
    this.deps     = options.deps

    this.diagram   = document.querySelector(this.selector)
    this.nodes     = Array.from(this.diagram.querySelectorAll(`${this.selector} [data-dag-node-name]`))
    this.nodeNames = this.nodes.map(e => e.getAttribute("data-dag-node-name"))
  }

  render() {
    this.ranks = Rank.calculate(this.nodeNames, this.deps)

    this.addVirtualNodes()

    // this.moveNodesIntoColumns(this.ranks)
    this.drawNodes()
    this.drawEdges()

    $(this.selector).height("300px")
  }

  findDomNode(name) {
    return $(`${this.selector} [data-dag-node-name=${name}]`)
  }

  rankDistance(a, b) {
    return this.ranks[a] - this.ranks[b]
  }

  addVirtualNodes() {
    //
    // Find every edge that has distance > 1
    //
    let edges = [];

    Object.keys(this.deps).forEach((target) => {
      this.deps[target].forEach((source) => {
        let dis = this.rankDistance(target, source)

        edges.push([source, target, dis])
      })
    })

    //
    // Tear up the edges, and introduce virtual nodes for each column
    //

    edges.filter(e => e[2] > 1).forEach(e => {
      let source = e[0]
      let target = e[1]
      let distance = e[2]

      // Tear up edge
      this.deps[target] = this.deps[target].filter(e => e !== source)

      let path = [source]

      for(let i=this.ranks[source] + 1; i <= this.ranks[target] - 1; i++) {
        let name = `virtual-node-${target}-${source}-${i}`
        this.ranks[name] = i
        this.nodeNames.push(name)
        this.deps[name] = []
        path.push(name)
      }

      path.push(target)
      console.log(path.length-1)

      for(let i = 1; i < path.length; i++) {
        this.deps[path[i]].push(path[i-1])
      }
    })
  }

  drawNodes() {
    //
    // create virtual nodes
    //
    this.nodeNames.forEach(n => {
      if(n.includes("virtual")) {
        $(`${this.selector} > [data-dag-nodes]`).append($(`<div class="virtual-block" data-dag-node-name=${n}>${n}</div>`))
      }
    })

    //
    // Collect elements in a matrix
    //
    let elements = []

    this.nodeNames.forEach(n => {
      let rank = this.ranks[n]

      elements[rank] = elements[rank] || []
      elements[rank].push(n)
    })

    //
    // Sort by dependancy on left
    //
    elements.forEach((column, i) => {
      if(i === 0) return; // skip first column
      console.log(column)

      column.sort((a, b) => {
        let heightOfLeftDepsForA = this.deps[a].map((d) => {
          return elements[i-1].findIndex(x => x === d)
        })

        let heightOfLeftDepsForB = this.deps[b].map((d) => {
          return elements[i-1].findIndex(x => x === d)
        })

        let m1 = Math.min(...heightOfLeftDepsForA)
        let m2 = Math.min(...heightOfLeftDepsForB)

        if(m1 === m2) {
          return avg(heightOfLeftDepsForA) > avg(heightOfLeftDepsForB)
        }

        return m1 > m2
      })
    })

    elements = transpose(elements)

    //
    // Draw the matrix in table
    //
    elements.forEach((row, y) => {
      let tr = $("<tr>")

      row.forEach((el, x) => {
        let td = $("<td></td>")

        let node = this.findDomNode(el)
        td.append(node)

        tr.append(td)
      })

      $(this.selector).find("table").append(tr)
    })
  }

  //
  // Injects nodes into appropriate columns based on their "rank"
  //
  moveNodesIntoColumns(ranks) {
    let columns = Math.max(...Object.keys(ranks).map(n => ranks[n])) + 1

    for(let i = 0; i < columns; i++) {
      let col = $("<div></div>")

      let nodeNames = Object.keys(ranks).filter((n) => ranks[n] === i)

      nodeNames.forEach(n => {
        if(n.includes("virtual")) {
          console.log("A")
          col.append($(`<div class="virtual-block" data-dag-node-name=${n}>${n}</div>`))
        } else {
          col.append(this.findDomNode(n))
        }
      })

      $(`${this.selector} [data-dag-nodes]`).append(col)
    }
  }

  drawEdges() {
    let diagram = $(this.selector)

    Object.keys(this.deps).forEach((targetName) => {
      this.deps[targetName].forEach((sourceName) => {
        let source = this.findDomNode(sourceName)
        let target = this.findDomNode(targetName)

        let sourceBox = {
          left:   source.offset().left - diagram.offset().left,
          right:  source.offset().left - diagram.offset().left + source.outerWidth(),
          top:    source.offset().top - diagram.offset().top,
          bottom: source.offset().top - diagram.offset().top + source.outerHeight()
        }

        let targetBox = {
          left:   target.offset().left - diagram.offset().left,
          right:  target.offset().left - diagram.offset().left + target.outerWidth(),
          top:    target.offset().top - diagram.offset().top,
          bottom: target.offset().top - diagram.offset().top + target.outerHeight()
        }

        let sourceXCenter = sourceBox.left + (sourceBox.right - sourceBox.left) / 2
        let sourceYCenter = sourceBox.top  + (sourceBox.bottom - sourceBox.top) / 2
        let targetXCenter = targetBox.left + (targetBox.right - targetBox.left) / 2
        let targetYCenter = targetBox.top  + (targetBox.bottom - targetBox.top) / 2

        let line = SVGLine.curved(
          [sourceBox.right, sourceYCenter],
          [targetBox.left, targetYCenter]
        )

        $(this.selector + " svg").append(line)
      })
    })

    this.nodeNames.filter(n => n.includes("virtual")).forEach(n => {
      let node = this.findDomNode(n)

      let box = {
        left:   node.offset().left - diagram.offset().left,
        right:  node.offset().left - diagram.offset().left + node.outerWidth(),
        top:    node.offset().top - diagram.offset().top,
        bottom: node.offset().top - diagram.offset().top + node.outerHeight()
      }

      let nodeXCenter = box.left + (box.right - box.left) / 2
      let nodeYCenter = box.top  + (box.bottom - box.top) / 2

      let line = SVGLine.streight(
        [box.left, nodeYCenter],
        [box.right, nodeYCenter]
      )

      $(this.selector + " svg").append(line)
    })
  }
}

$(function() {

  let dag1 = new Dagger("#diagram1", {
    deps: {
      "lint": [],
      "rspec": ["lint"],
      "cucumber": ["lint"],
      "deploy": ["rspec", "cucumber"]
    }
  })

  dag1.render()

  let dag2 = new Dagger("#diagram2", {
    deps: {
      "A": [],
      "B": ["A"],
      "C": ["B", "A"],
      "D": ["C", "A"]
    }
  })

  dag2.render()

  console.log("AAAA")

  let dag3 = new Dagger("#diagram3", {
    deps: {
      "0": [],
      "A": ["0"],
      "B": ["A"],
      "C": [],
      "D": ["C"],
      "E": ["D", "B"]
    }
  })

  dag3.render()
})
