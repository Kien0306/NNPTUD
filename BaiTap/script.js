const API_URL = "https://api.escuelajs.co/api/v1/products";

let allProducts = [];
let displayedProducts = [];
let currentPage = 1;
let itemsPerPage = 10;
let sortConfig = { key: null, direction: 'asc' };

let detailModalInstance;
let createModalInstance;

document.addEventListener('DOMContentLoaded', () => {
    detailModalInstance = new bootstrap.Modal(document.getElementById('detailModal'));
    createModalInstance = new bootstrap.Modal(document.getElementById('createModal'));
    
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('pageSize').addEventListener('change', handlePageSizeChange);

    fetchProducts();
});

async function fetchProducts() {
    try {
        const response = await fetch(API_URL); 
        const data = await response.json();
        
        allProducts = data;
        displayedProducts = [...allProducts];
        
        renderTable();
        renderPagination();
    } catch (error) {
        console.error(error);
        alert("Không thể tải danh sách sản phẩm.");
    }
}

function renderTable() {
    const tbody = document.getElementById('productTableBody');
    tbody.innerHTML = '';

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = displayedProducts.slice(startIndex, endIndex);

    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Không tìm thấy dữ liệu</td></tr>';
        return;
    }

    pageData.forEach(item => {
        let imgUrl = "https://placehold.co/50?text=No+Image";
        
        if (item.images && item.images.length > 0) {
            let rawUrl = item.images[0];
            if (typeof rawUrl === 'string') {
                rawUrl = rawUrl.replace(/[\[\]"]/g, '');
                if (rawUrl.startsWith('http')) {
                    imgUrl = rawUrl;
                }
            }
        }

        const tr = document.createElement('tr');
        tr.title = `Description: ${item.description}`;
        tr.style.cursor = "pointer";
        
        tr.onclick = (e) => {
            if(!e.target.closest('button')) {
                openViewModal(item.id);
            }
        };

        tr.innerHTML = `
            <td>${item.id}</td>
            <td class="fw-bold">${item.title}</td>
            <td class="text-success">$${item.price}</td>
            <td><span class="badge bg-info text-dark">${item.category ? item.category.name : 'N/A'}</span></td>
            <td>
                <img src="${imgUrl}" 
                     class="product-img" 
                     alt="img"
                     onerror="this.onerror=null; this.src='https://placehold.co/50?text=Error';">
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="openViewModal(${item.id})">
                    <i class="fa-solid fa-eye"></i> View
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderPagination() {
    const totalPages = Math.ceil(displayedProducts.length / itemsPerPage);
    const paginationEl = document.getElementById('pagination');
    paginationEl.innerHTML = '';

    paginationEl.innerHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <button class="page-link" onclick="changePage(${currentPage - 1})">Prev</button>
        </li>
    `;

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        paginationEl.innerHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <button class="page-link" onclick="changePage(${i})">${i}</button>
            </li>
        `;
    }

    paginationEl.innerHTML += `
        <li class="page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}">
            <button class="page-link" onclick="changePage(${currentPage + 1})">Next</button>
        </li>
    `;
}

function changePage(page) {
    currentPage = page;
    renderTable();
    renderPagination();
}

function handlePageSizeChange(e) {
    itemsPerPage = parseInt(e.target.value);
    currentPage = 1;
    renderTable();
    renderPagination();
}

function handleSearch(e) {
    const keyword = e.target.value.toLowerCase();
    displayedProducts = allProducts.filter(p => 
        p.title.toLowerCase().includes(keyword)
    );
    currentPage = 1;
    renderTable();
    renderPagination();
}

function handleSort(key) {
    if (sortConfig.key === key) {
        sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortConfig.key = key;
        sortConfig.direction = 'asc';
    }

    document.querySelectorAll('.fa-sort').forEach(i => i.className = 'fa-solid fa-sort text-muted');
    const iconId = key === 'price' ? 'sort-price-icon' : 'sort-title-icon';
    const activeIcon = document.getElementById(iconId);
    activeIcon.className = sortConfig.direction === 'asc' 
        ? 'fa-solid fa-sort-up text-primary' 
        : 'fa-solid fa-sort-down text-primary';

    displayedProducts.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    renderTable();
}

function exportToCSV() {
    if (displayedProducts.length === 0) {
        alert("Không có dữ liệu để xuất!");
        return;
    }

    const headers = ["ID", "Title", "Price", "Category", "Description"];
    
    const rows = displayedProducts.map(item => [
        item.id,
        `"${item.title.replace(/"/g, '""')}"`, 
        item.price,
        item.category ? item.category.name : "",
        `"${item.description.replace(/"/g, '""')}"`
    ]);

    const csvContent = "sep=,\r\n" + [
        headers.join(","), 
        ...rows.map(row => row.join(","))
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "products_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

let currentDetailProduct = null;

function openViewModal(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    currentDetailProduct = product;

    document.getElementById('btnEnableEdit').classList.remove('d-none');
    document.getElementById('btnSaveUpdate').classList.add('d-none');
    
    ['detailTitle', 'detailPrice', 'detailDescription'].forEach(id => {
        document.getElementById(id).disabled = true;
    });

    document.getElementById('detailId').value = product.id;
    document.getElementById('detailTitle').value = product.title;
    document.getElementById('detailPrice').value = product.price;
    document.getElementById('detailDescription').value = product.description;
    
    let imgUrl = "https://placehold.co/200?text=No+Image";
    if (product.images && product.images.length > 0) {
         let rawUrl = product.images[0].replace(/[\[\]"]/g, '');
         if(rawUrl.startsWith('http')) imgUrl = rawUrl;
    }
    document.getElementById('detailImage').src = imgUrl;

    detailModalInstance.show();
}

function enableEditMode() {
    document.getElementById('btnEnableEdit').classList.add('d-none');
    document.getElementById('btnSaveUpdate').classList.remove('d-none');

    ['detailTitle', 'detailPrice', 'detailDescription'].forEach(id => {
        document.getElementById(id).disabled = false;
    });
}

async function updateProduct() {
    const id = document.getElementById('detailId').value;
    const updatedData = {
        title: document.getElementById('detailTitle').value,
        price: parseFloat(document.getElementById('detailPrice').value),
        description: document.getElementById('detailDescription').value
    };

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });

        if (response.ok) {
            alert("Cập nhật thành công!");
            detailModalInstance.hide();
            const index = allProducts.findIndex(p => p.id == id);
            if (index !== -1) {
                allProducts[index] = { ...allProducts[index], ...updatedData };
                handleSearch({ target: { value: document.getElementById('searchInput').value } }); 
            }
        } else {
            alert("Lỗi khi cập nhật sản phẩm.");
        }
    } catch (error) {
        console.error(error);
        alert("Lỗi kết nối.");
    }
}

function openCreateModal() {
    document.getElementById('createForm').reset();
    createModalInstance.show();
}

async function createProduct() {
    const title = document.getElementById('createTitle').value;
    const price = parseFloat(document.getElementById('createPrice').value);
    const description = document.getElementById('createDescription').value;
    const categoryId = parseInt(document.getElementById('createCategoryId').value);
    const imageUrl = document.getElementById('createImage').value;

    if(!title || !price || !description || !imageUrl) {
        alert("Vui lòng nhập đủ thông tin.");
        return;
    }

    const newData = {
        title: title,
        price: price,
        description: description,
        categoryId: categoryId,
        images: [imageUrl]
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newData)
        });

        if (response.ok) {
            const createdProduct = await response.json();
            alert("Tạo mới thành công! ID: " + createdProduct.id);
            createModalInstance.hide();
            
            allProducts.unshift(createdProduct);
            handleSearch({ target: { value: '' } }); 
        } else {
            alert("Lỗi khi tạo sản phẩm (Kiểm tra Category ID).");
        }
    } catch (error) {
        console.error(error);
        alert("Lỗi kết nối.");
    }
}