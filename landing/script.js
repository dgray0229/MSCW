document.addEventListener('DOMContentLoaded', () => {
  // Mobile Navigation Menu Toggle
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const mainNav = document.getElementById('main-nav');

  if (mobileMenuToggle && mainNav) {
    mobileMenuToggle.addEventListener('click', () => {
      mainNav.classList.toggle('active');
      mobileMenuToggle.classList.toggle('open');
      
      // Toggle CSS burger menu states
      const spans = mobileMenuToggle.querySelectorAll('span');
      if (mainNav.classList.contains('active')) {
        spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(6px, -6px)';
        mainNav.style.display = 'flex';
        mainNav.style.flexDirection = 'column';
        mainNav.style.position = 'absolute';
        mainNav.style.top = '70px';
        mainNav.style.left = '0';
        mainNav.style.right = '0';
        mainNav.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
        mainNav.style.padding = '24px';
        mainNav.style.borderBottom = '1px solid rgba(226, 232, 240, 0.1)';
        mainNav.style.alignItems = 'center';
        mainNav.style.gap = '20px';
      } else {
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
        mainNav.style.display = '';
      }
    });
  }

  // Methodology Accordion
  const accordionTriggers = document.querySelectorAll('.accordion-trigger');
  
  accordionTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const currentItem = trigger.parentElement;
      const isActive = currentItem.classList.contains('active');
      
      // Collapse all items
      document.querySelectorAll('.accordion-item').forEach(item => {
        item.classList.remove('active');
        const panel = item.querySelector('.accordion-panel');
        if (panel) panel.style.maxHeight = null;
      });
      
      // If the clicked item was not active, expand it
      if (!isActive) {
        currentItem.classList.add('active');
        const panel = currentItem.querySelector('.accordion-panel');
        if (panel) {
          panel.style.maxHeight = panel.scrollHeight + 'px';
        }
      }
    });
  });

  // Capacity Calculator Logic
  let calculatorTasks = [];
  const maxCapacity = 8;

  const btnAddTask = document.getElementById('btn-add-calc-task');
  const inputTaskTitle = document.getElementById('calc-task-title');
  const selectTaskPoints = document.getElementById('calc-task-points');
  const calcTasksList = document.getElementById('calc-tasks-list');
  const calcEmptyState = document.getElementById('calc-empty-state');
  const calcPointsDisplay = document.getElementById('calc-points-display');
  const calcStatusDisplay = document.getElementById('calc-status-display');
  const calcGaugeFill = document.getElementById('calc-gauge-fill');
  const capacityPercentage = document.getElementById('capacity-percentage');
  const calcTaskCount = document.getElementById('calc-task-count');

  function updateCalculatorUI() {
    // 1. Calculate total points
    const totalPoints = calculatorTasks.reduce((sum, task) => sum + task.points, 0);
    
    // 2. Update points and percentage display
    calcPointsDisplay.textContent = `${totalPoints} / ${maxCapacity}`;
    const fillPercent = Math.min(100, (totalPoints / maxCapacity) * 100);
    calcGaugeFill.style.width = `${fillPercent}%`;
    capacityPercentage.textContent = `${Math.round((totalPoints / maxCapacity) * 100)}%`;
    
    // 3. Update task count badge
    calcTaskCount.textContent = `${calculatorTasks.length} ${calculatorTasks.length === 1 ? 'Task' : 'Tasks'}`;

    // 4. Reset classes
    calcStatusDisplay.className = 'stat-status';
    calcGaugeFill.style.backgroundColor = '';
    calcGaugeFill.style.boxShadow = '';

    // 5. Apply states based on capacity constraints
    if (totalPoints === 0) {
      calcStatusDisplay.textContent = 'Healthy Load';
      calcStatusDisplay.classList.add('text-green');
    } else if (totalPoints <= 6) {
      calcStatusDisplay.textContent = 'Healthy Load';
      calcStatusDisplay.classList.add('text-green');
      calcGaugeFill.style.backgroundColor = '#10b981'; // Green
      calcGaugeFill.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.5)';
    } else if (totalPoints <= maxCapacity) {
      calcStatusDisplay.textContent = 'Optimized Focus';
      calcStatusDisplay.classList.add('text-yellow');
      calcGaugeFill.style.backgroundColor = '#d97706'; // Amber/Orange
      calcGaugeFill.style.boxShadow = '0 0 10px rgba(217, 119, 6, 0.5)';
    } else {
      calcStatusDisplay.textContent = 'Burnout Risk!';
      calcStatusDisplay.classList.add('text-red');
      calcGaugeFill.style.backgroundColor = '#ef4444'; // Red
      calcGaugeFill.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.8)';
    }

    // 6. Manage empty state graphic visibility
    if (calculatorTasks.length === 0) {
      calcEmptyState.style.display = 'flex';
    } else {
      calcEmptyState.style.display = 'none';
    }

    // 7. Render Task Cards in Calculator List
    // Save scroll position
    const scrollPos = calcTasksList.scrollTop;
    
    // Clear list but retain empty state if needed
    const emptyStateHTML = calcEmptyState.outerHTML;
    calcTasksList.innerHTML = '';
    calcTasksList.appendChild(calcEmptyState);

    calculatorTasks.forEach((task) => {
      const card = document.createElement('div');
      card.className = 'calc-task-item';
      card.innerHTML = `
        <div class="calc-task-item-left">
          <span class="calc-task-item-points">${task.points} pts</span>
          <span class="calc-task-item-title">${escapeHTML(task.title)}</span>
        </div>
        <button class="calc-task-delete" aria-label="Delete task ${escapeHTML(task.title)}" data-id="${task.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      `;

      // Set delete trigger listener
      card.querySelector('.calc-task-delete').addEventListener('click', (e) => {
        const idToDelete = e.currentTarget.getAttribute('data-id');
        deleteTask(idToDelete);
      });

      calcTasksList.appendChild(card);
    });

    // Restore scroll position
    calcTasksList.scrollTop = scrollPos;
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

  function deleteTask(id) {
    calculatorTasks = calculatorTasks.filter(task => task.id !== id);
    updateCalculatorUI();
  }

  function handleAddTask() {
    const title = inputTaskTitle.value.trim();
    const points = parseInt(selectTaskPoints.value, 10);

    if (!title) {
      inputTaskTitle.style.borderColor = '#ef4444';
      inputTaskTitle.focus();
      return;
    }
    
    // Reset border
    inputTaskTitle.style.borderColor = '';

    const newTask = {
      id: Date.now().toString(),
      title: title,
      points: points
    };

    calculatorTasks.push(newTask);
    inputTaskTitle.value = '';
    
    updateCalculatorUI();
    
    // Scroll list to bottom to show new task
    setTimeout(() => {
      calcTasksList.scrollTop = calcTasksList.scrollHeight;
    }, 50);
  }

  if (btnAddTask && inputTaskTitle) {
    btnAddTask.addEventListener('click', handleAddTask);
    inputTaskTitle.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleAddTask();
      }
    });
  }

  // Inject some cool initial demo tasks into the calculator for immediate interaction!
  calculatorTasks = [
    { id: '1', title: 'Refactor database indexing', points: 3 },
    { id: '2', title: 'Design premium pricing tiers', points: 2 },
    { id: '3', title: 'Sync calendar permissions API', points: 1 }
  ];

  updateCalculatorUI();
});
